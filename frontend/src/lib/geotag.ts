import exifr from 'exifr'
import piexif from 'piexifjs'

import type { LatLng } from '@/lib/geo'

/**
 * Photo geotagging.
 *
 * - Camera captures: the user's current fix is written into the JPEG's EXIF GPS
 *   tags, so the stored evidence image carries its location permanently.
 * - Gallery picks: EXIF GPS is read from the ORIGINAL file (before any
 *   rewrite) and offered to the user as the report location.
 *
 * Only JPEG is writable here; HEIC/WebP skip gracefully — the report's GPS
 * columns stay the source of truth either way.
 */

/** Where the report's location came from — shown as a provenance line. */
export type LocationProvenance = 'gps' | 'photo' | 'pin'

export const PROVENANCE_LABEL: Record<LocationProvenance, string> = {
  gps: 'live GPS',
  photo: 'from photo',
  pin: 'placed on map',
}

function isJpeg(file: File): boolean {
  return file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the photo file.'))
    reader.readAsDataURL(file)
  })
}

function dataURLToFile(dataUrl: string, original: File): File {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  return new File([bytes], original.name || 'photo.jpg', {
    type: original.type || 'image/jpeg',
    lastModified: original.lastModified,
  })
}

/**
 * Writes the coordinates into the file's EXIF GPS tags and returns a new File.
 * Resolves null when the file is not a writable JPEG (HEIC/WebP/PNG) or the
 * rewrite fails — callers then upload the original, untagged.
 */
export async function embedGpsInJpeg(file: File, coords: LatLng): Promise<File | null> {
  if (!isJpeg(file)) return null

  try {
    const dataUrl = await fileToDataURL(file)
    const exif = piexif.load(dataUrl)

    exif.GPS = {
      [piexif.GPSIFD.GPSVersionID]: [2, 3, 0, 0],
      [piexif.GPSIFD.GPSLatitudeRef]: coords.latitude < 0 ? 'S' : 'N',
      [piexif.GPSIFD.GPSLatitude]: piexif.GPSHelper.degToDmsRational(Math.abs(coords.latitude)),
      // East positive, West negative — an inverted ref here is the difference
      // between Bengaluru and the middle of the Pacific.
      [piexif.GPSIFD.GPSLongitudeRef]: coords.longitude < 0 ? 'W' : 'E',
      [piexif.GPSIFD.GPSLongitude]: piexif.GPSHelper.degToDmsRational(Math.abs(coords.longitude)),
      [piexif.GPSIFD.GPSMapDatum]: 'WGS-84',
    }

    const tagged = piexif.insert(piexif.dump(exif), dataUrl)
    return dataURLToFile(tagged, file)
  } catch {
    // Malformed EXIF or non-JPEG bytes: keep the original, untagged.
    return null
  }
}

/**
 * Reads EXIF GPS from a photo. Returns null when absent, unreadable, or the
 * format is unsupported (exifr covers JPEG and HEIC-extracted JPEGs).
 */
export async function readExifGps(file: File): Promise<LatLng | null> {
  try {
    const gps = await exifr.gps(file)
    if (!gps) return null
    const { latitude, longitude } = gps
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null
    return { latitude, longitude }
  } catch {
    return null
  }
}
