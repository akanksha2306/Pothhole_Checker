import type { RequestHandler } from 'express';
import { BadRequestError } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import { storageService } from '../services/storage.service.js';
import { PhotoContentTypeEnum, type PhotoContentType, type PhotoUploadRequest } from 'shared';

/** POST /api/uploads/photo — presigned PUT URL for the client to upload to R2. */
export const createPhotoUploadUrl: RequestHandler = asyncHandler(async (req, res) => {
  const session = requireUser(req);
  const { contentType } = validated<PhotoUploadRequest>(req, 'body');
  const upload = await storageService.createPhotoUploadUrl(session.sub, contentType);
  res.status(200).json(upload);
});

/**
 * POST /api/uploads/photo-direct — relay the photo bytes to R2 server-side.
 * The raw-body middleware on the route turned the request into a Buffer; the
 * Content-Type header carries the (already-validated) image MIME type.
 */
export const uploadPhotoDirect: RequestHandler = asyncHandler(async (req, res) => {
  const session = requireUser(req);

  const parsed = PhotoContentTypeEnum.safeParse(req.headers['content-type']);
  if (!parsed.success) {
    throw new BadRequestError('Send the photo as the request body with its image Content-Type header');
  }
  const contentType: PhotoContentType = parsed.data;

  const bytes = req.body as unknown;
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new BadRequestError('The photo body is empty');
  }

  const upload = await storageService.uploadPhoto(session.sub, contentType, bytes);
  res.status(201).json(upload);
});
