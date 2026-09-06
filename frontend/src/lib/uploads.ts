import type { PhotoContentType, PhotoUploadUrlResponse } from 'shared'

import { isApiError, NetworkError } from '@/lib/api'
import { sessionApi } from '@/lib/session-api'

export class PhotoUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PhotoUploadError'
  }
}

export function describePhotoContentType(contentType: string): string {
  switch (contentType) {
    case 'image/heic':
      return 'HEIC (iPhone)'
    case 'image/jpeg':
      return 'JPEG'
    case 'image/png':
      return 'PNG'
    case 'image/webp':
      return 'WebP'
    default:
      return contentType
  }
}

/**
 * Two-step upload: presigned URL from our backend, then a raw PUT of the file
 * to storage. The presigned signature pins the content type, so the PUT header
 * must repeat exactly what we asked for.
 *
 * When storage CORS blocks the direct PUT (the bucket allowlist not yet
 * covering this origin), we fall back to the same-origin relay — the backend
 * stores the bytes with its own credentials — so upload works everywhere.
 */
export async function uploadReportPhoto(file: File): Promise<{ key: string }> {
  if (!sessionApi.isSupportedContentType(file.type)) {
    throw new PhotoUploadError(
      `“${describePhotoContentType(file.type)}” is not a supported photo format. Use a JPEG, PNG or WebP image.`,
    )
  }
  const contentType: PhotoContentType = file.type

  let upload: PhotoUploadUrlResponse
  try {
    upload = await sessionApi.requestPhotoUpload(contentType)
  } catch (error: unknown) {
    if (isApiError(error)) throw error
    throw new NetworkError(error)
  }

  let putResponse: Response
  try {
    putResponse = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    })
  } catch {
    // CORS/network reject on the direct PUT — relay through our backend.
    return sessionApi.uploadPhotoDirect(file, contentType)
  }

  if (!putResponse.ok) {
    throw new PhotoUploadError(
      `The photo could not be uploaded (storage responded ${putResponse.status}). Try again.`,
    )
  }

  return upload
}
