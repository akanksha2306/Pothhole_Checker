import 'leaflet/dist/leaflet.css'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import { Button } from '@/components/ui/button'
import type { LatLng } from '@/lib/geo'
import { formatCoordinates } from '@/lib/format'

interface PinDropSheetProps {
  open: boolean
  /** Current fix (or last known pin) the map centres on; falls back to Bengaluru. */
  initialLocation: LatLng | null
  onClose: () => void
  onConfirm: (location: LatLng) => void
}

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'pothole-marker pothole-marker--selected',
    html: '<span class="pothole-marker__pulse"></span><span class="pothole-marker__dot" style="background:#10b981"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

/**
 * Manual placement for reports whose photo carries no usable GPS: tap the dark
 * mini-map to drop the pin, confirm to use those coordinates.
 */
export function PinDropSheet({
  open,
  initialLocation,
  onClose,
  onConfirm,
}: PinDropSheetProps) {
  const [pin, setPin] = useState<LatLng>(
    initialLocation ?? { latitude: 12.9716, longitude: 77.5946 },
  )

  useEffect(() => {
    if (open && initialLocation) {
      setPin(initialLocation)
    }
  }, [open, initialLocation])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const center = initialLocation ?? { latitude: 12.9716, longitude: 77.5946 }

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end justify-center bg-black/70 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Place pin on map"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[430px] overflow-hidden rounded-t-3xl border border-border bg-card shadow-overlay sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="space-y-0.5">
            <p className="font-heading text-body-lg font-semibold text-foreground">
              Place pin on map
            </p>
            <p className="text-label-md text-muted-foreground">
              Tap the map to drop the pin where the pothole is
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close map"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="h-72 sm:h-80">
          <MapContainer
            center={[center.latitude, center.longitude]}
            zoom={16}
            zoomControl={false}
            scrollWheelZoom
            className="size-full"
            attributionControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <Marker
              position={[pin.latitude, pin.longitude]}
              icon={pinIcon()}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const latlng = event.target.getLatLng()
                  setPin({ latitude: latlng.lat, longitude: latlng.lng })
                },
              }}
            />
            <PinCapture onPick={setPin} />
            <RecenterOnOpen target={initialLocation} />
          </MapContainer>
        </div>

        <div className="space-y-3 border-t border-border px-4 py-3">
          <p className="font-mono text-label-md text-muted-foreground">
            {formatCoordinates(pin.latitude, pin.longitude)}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onConfirm({ latitude: pin.latitude, longitude: pin.longitude })
                onClose()
              }}
            >
              Use this location
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PinCapture({ onPick }: { onPick: (coords: LatLng) => void }) {
  useMapEvents({
    click: (event) => onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
  })
  return null
}

/** Ensures the sheet opens centred on the user's fix rather than the default. */
function RecenterOnOpen({ target }: { target: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.setView([target.latitude, target.longitude])
    }
  }, [map, target])
  return null
}
