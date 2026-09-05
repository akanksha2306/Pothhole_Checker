import 'leaflet/dist/leaflet.css'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { PotholeListItem } from 'shared'

import { DEFAULT_MAP_CENTER } from '@/lib/geo'

/** Marker colours keyed by lifecycle status (rose / amber / emerald). */
const MARKER_COLOR: Record<PotholeListItem['status'], string> = {
  REPORTED: '#f43f5e',
  ACKNOWLEDGED: '#f59e0b',
  IN_PROGRESS: '#f59e0b',
  AWAITING_VERIFICATION: '#8b5cf6',
  RESOLVED: '#10b981',
}

function markerIcon(status: PotholeListItem['status'], selected: boolean): L.DivIcon {
  const size = selected ? 22 : 18
  const pulse = selected ? '<span class="pothole-marker__pulse"></span>' : ''
  return L.divIcon({
    className: selected ? 'pothole-marker pothole-marker--selected' : 'pothole-marker',
    html: `${pulse}<span class="pothole-marker__dot" style="background:${MARKER_COLOR[status]}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function youBeaconIcon(): L.DivIcon {
  return L.divIcon({
    className: 'you-beacon',
    html: '<span class="you-beacon__dot"><span class="you-beacon__halo"></span></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

export interface PotholeMapProps {
  potholes: readonly PotholeListItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Signed-in user's position for the beacon; null hides it. */
  me: { latitude: number; longitude: number } | null
  /** Only used before any marker exists (empty map). */
  fallbackCenter?: { latitude: number; longitude: number }
}

/**
 * Dark-blended OSM map. The tile pane is CSS-filtered into the app's dark-green
 * language while markers stay unfiltered (see .leaflet-tile-pane in index.css).
 */
export function PotholeMap({ potholes, selectedId, onSelect, me, fallbackCenter }: PotholeMapProps) {
  const center = useMemo(() => me ?? fallbackCenter ?? DEFAULT_MAP_CENTER, [me, fallbackCenter])
  const newest = potholes[0]

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={15}
      scrollWheelZoom
      // Pinch / scroll / double-click cover zooming; hiding the control keeps
      // Leaflet's z-index-1000 widgets out from under the app's overlays.
      zoomControl={false}
      className="size-full"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {me && <Marker position={[me.latitude, me.longitude]} icon={youBeaconIcon()} />}

      {potholes.map((pothole) => (
        <Marker
          key={pothole.id}
          position={[pothole.latitude, pothole.longitude]}
          icon={markerIcon(pothole.status, pothole.id === selectedId)}
          zIndexOffset={pothole.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(pothole.id) }}
        />
      ))}

      <Recenter target={me ?? (newest ? { latitude: newest.latitude, longitude: newest.longitude } : null)} />
      <DismissOnMapTap onDismiss={() => onSelect(null)} />
    </MapContainer>
  )
}

/** Moves the map once per new target; never fights the user's manual panning. */
function Recenter({ target }: { target: { latitude: number; longitude: number } | null }) {
  const map = useMap()
  const lastKey = useMemo(() => ({ value: '' }), [])

  useEffect(() => {
    if (!target) return
    const key = `${target.latitude.toFixed(5)},${target.longitude.toFixed(5)}`
    if (lastKey.value === key) return
    lastKey.value = key
    map.panTo([target.latitude, target.longitude], { animate: true })
  }, [target, map, lastKey])

  return null
}

/** Tapping bare map closes the callout. */
function DismissOnMapTap({ onDismiss }: { onDismiss: () => void }) {
  useMapEvents({ click: () => onDismiss() })
  return null
}
