import type { RequestHandler } from 'express';
import type {
  NearbyPotholeQuery,
  Pothole,
  PotholeDetail,
  PotholeListQuery,
  PotholeListResponse,
  PotholeStatusUpdateInput,
} from 'shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { NotFoundError } from '../lib/errors.js';
import { sendPhotoRedirect } from '../lib/photo.js';
import { requireUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import { potholeService } from '../services/pothole.service.js';
import { repairService } from '../services/repair.service.js';
import { storageService } from '../services/storage.service.js';

/** GET /api/potholes/nearby?latitude&longitude — pothole within radius, or null. */
export const getNearbyPothole: RequestHandler = asyncHandler(async (req, res) => {
  requireUser(req);
  const { latitude, longitude } = validated<NearbyPotholeQuery>(req, 'query');

  const match = await potholeService.findNearby(latitude, longitude);
  const body: { pothole: Pothole | null; distanceMeters?: number } = match
    ? { pothole: match.pothole, distanceMeters: match.distanceMeters }
    : { pothole: null };

  res.status(200).json(body);
});

/** GET /api/potholes?status&sort&limit&cursor — map + list screens. */
export const listPotholes: RequestHandler = asyncHandler(async (req, res) => {
  requireUser(req);
  const query = validated<PotholeListQuery>(req, 'query');

  const page: PotholeListResponse = await potholeService.list(query);
  res.status(200).json(page);
});

/** GET /api/potholes/:idOrHumanCode — pothole + timeline + reports + repair evidence. */
export const getPotholeDetail: RequestHandler = asyncHandler(async (req, res) => {
  const viewer = requireUser(req);
  const { idOrHumanCode } = validated<{ idOrHumanCode: string }>(req, 'params');

  const [detail, repairs] = await Promise.all([
    potholeService.getDetail(idOrHumanCode),
    repairService.listForPothole(idOrHumanCode, viewer.sub),
  ]);

  const payload: PotholeDetail = { ...detail, repairs };
  res.status(200).json(payload);
});

/**
 * GET /api/potholes/:idOrHumanCode/photo — 302 to a presigned GET of the
 * primary photo. Potholes are community data, so any signed-in user can view.
 * Lets the map callout, list cards, and detail page use one <img> URL each.
 */
export const getPotholePhoto: RequestHandler = asyncHandler(async (req, res) => {
  requireUser(req);
  const { idOrHumanCode } = validated<{ idOrHumanCode: string }>(req, 'params');

  const photoKey = await potholeService.getPrimaryPhotoKey(idOrHumanCode);
  await sendPhotoRedirect(res, storageService, photoKey, new NotFoundError('Pothole photo is no longer available'));
});

/** PATCH /api/potholes/:idOrHumanCode/status — admin only. */
export const updatePotholeStatus: RequestHandler = asyncHandler(async (req, res) => {
  const actor = requireUser(req);
  const { idOrHumanCode } = validated<{ idOrHumanCode: string }>(req, 'params');
  const { status, note } = validated<PotholeStatusUpdateInput>(req, 'body');

  const pothole: Pothole = await potholeService.updateStatus(idOrHumanCode, actor.sub, status, note);
  res.status(200).json(pothole);
});
