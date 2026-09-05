import type { RequestHandler } from 'express';
import type { PhotoUploadRequest } from 'shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import { storageService } from '../services/storage.service.js';

/** POST /api/uploads/photo — presigned PUT URL for the client to upload to R2. */
export const createPhotoUploadUrl: RequestHandler = asyncHandler(async (req, res) => {
  const session = requireUser(req);
  const { contentType } = validated<PhotoUploadRequest>(req, 'body');
  const upload = await storageService.createPhotoUploadUrl(session.sub, contentType);
  res.status(200).json(upload);
});
