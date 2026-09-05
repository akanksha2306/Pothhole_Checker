import { Router } from 'express';
import { PhotoUploadRequestSchema } from 'shared';
import { createPhotoUploadUrl } from '../controllers/uploads.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

/** Mounted at /api/uploads. */
export const uploadsRouter = Router();

uploadsRouter.post('/photo', requireAuth, validate({ body: PhotoUploadRequestSchema }), createPhotoUploadUrl);
