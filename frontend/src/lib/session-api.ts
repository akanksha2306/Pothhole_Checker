import {
  GoogleAuthRequestSchema,
  OkResponseSchema,
  PhotoUploadRequestSchema,
  PhotoUploadUrlResponseSchema,
  UserSchema,
  type PhotoUploadUrlResponse,
  type User,
} from 'shared'

import { apiClient, type ApiClient } from '@/lib/api'

/**
 * Session + upload endpoints: Google sign-in exchange, `/me`, logout and the
 * presigned photo upload. Report and pothole endpoints live in
 * `potholes-api.ts` (potholes are the primary entity).
 */
export class SessionApi {
  private readonly client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  /** Exchange a GIS ID token for an httpOnly cookie session. */
  signInWithGoogle(credential: string): Promise<User> {
    const body = GoogleAuthRequestSchema.parse({ credential })
    return this.client.post<User>('/auth/google', body, (value) => UserSchema.parse(value))
  }

  currentUser(): Promise<User> {
    return this.client.get<User>('/me', (value) => UserSchema.parse(value))
  }

  signOut(): Promise<void> {
    return this.client.post('/auth/logout', undefined, (value) => OkResponseSchema.parse(value)).then(
      () => undefined,
    )
  }

  /**
   * Ask for a presigned upload target. The returned `uploadUrl` must be PUT to
   * with a Content-Type identical to `contentType` — it is pinned in the
   * signature (see uploadReportPhoto in lib/uploads.ts).
   */
  requestPhotoUpload(contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic'): Promise<PhotoUploadUrlResponse> {
    const body = PhotoUploadRequestSchema.parse({ contentType })
    return this.client.post<PhotoUploadUrlResponse>('/uploads/photo', body, (value) =>
      PhotoUploadUrlResponseSchema.parse(value),
    )
  }

  /** Backend validates the same enum, so this keeps client and server in lockstep. */
  isSupportedContentType(contentType: string): contentType is 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' {
    return PhotoUploadRequestSchema.shape.contentType.safeParse(contentType).success
  }
}

export const sessionApi = new SessionApi(apiClient)
