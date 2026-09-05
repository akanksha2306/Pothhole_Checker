/**
 * Shared tail of the photo endpoints: verify the object exists, then 302 the
 * browser to a short-lived presigned GET URL. Keeping it in one place means the
 * reports and potholes photo routes can't drift apart.
 */
import type { Response } from 'express';
import { type AppError } from './errors.js';
import { type StorageService } from '../services/storage.service.js';

export async function sendPhotoRedirect(
  res: Response,
  storage: StorageService,
  photoKey: string,
  missingError: AppError,
): Promise<void> {
  // Storage not configured -> 503 from the service; object gone -> the caller's
  // 404, instead of handing the browser a URL that fails silently inside an <img>.
  if (storage.isConfigured()) {
    await storage.assertPhotoExists(photoKey, missingError);
  }

  const photoUrl = await storage.createPhotoViewUrl(photoKey);
  // Signed URLs expire: never let a browser (or proxy) cache the redirect.
  res.set('Cache-Control', 'private, no-store');
  res.redirect(302, photoUrl);
}
