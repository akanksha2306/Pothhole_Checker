import express, { Router } from 'express';
import { PhotoUploadRequestSchema } from 'shared';
import { createPhotoUploadUrl, uploadPhotoDirect } from '../controllers/uploads.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

/** Mounted at /api/uploads. */
export const uploadsRouter = Router();

uploadsRouter.post('/photo', requireAuth, validate({ body: PhotoUploadRequestSchema }), createPhotoUploadUrl);

/**
 * CORS-proof fallback: the browser POSTs the image bytes to us same-origin and
 * we relay them to R2 with server credentials. The express.raw cap (15 MB) is
 * well above any phone photo.
 */
uploadsRouter.post(
  '/photo-direct',
  requireAuth,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'], limit: '15mb' }),
  uploadPhotoDirect,
);
