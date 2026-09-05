import type { RequestHandler } from 'express';
import type {
  AssignRepairInput,
  Repair,
  RepairEvidenceUploadInput,
  RepairVerificationInput,
} from 'shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { NotFoundError } from '../lib/errors.js';
import { sendPhotoRedirect } from '../lib/photo.js';
import { requireUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import type { RepairEvidenceParams } from '../schemas/params.js';
import { repairService } from '../services/repair.service.js';
import { storageService } from '../services/storage.service.js';

/** POST /api/potholes/:idOrHumanCode/repairs — admin assigns a repair job. */
export const assignRepair: RequestHandler = asyncHandler(async (req, res) => {
  const admin = requireUser(req);
  const { idOrHumanCode } = validated<{ idOrHumanCode: string }>(req, 'params');
  const input = validated<AssignRepairInput>(req, 'body');

  const repair: Repair = await repairService.assign(idOrHumanCode, admin, input);
  res.status(201).json(repair);
});

/** POST /api/repairs/:id/pickup — repairer claims an ASSIGNED job. */
export const pickupRepair: RequestHandler = asyncHandler(async (req, res) => {
  const repairer = requireUser(req);
  const { id } = validated<{ id: string }>(req, 'params');

  const repair: Repair = await repairService.pickup(id, repairer);
  res.status(200).json(repair);
});

/** POST /api/repairs/:id/before-photo — GPS-bound "before" evidence. */
export const addBeforePhoto: RequestHandler = asyncHandler(async (req, res) => {
  const repairer = requireUser(req);
  const { id } = validated<{ id: string }>(req, 'params');
  const input = validated<RepairEvidenceUploadInput>(req, 'body');

  const repair: Repair = await repairService.addEvidence(id, repairer, 'before', input);
  res.status(200).json(repair);
});

/** POST /api/repairs/:id/after-photo — GPS-bound "after" evidence; submits for verification. */
export const addAfterPhoto: RequestHandler = asyncHandler(async (req, res) => {
  const repairer = requireUser(req);
  const { id } = validated<{ id: string }>(req, 'params');
  const input = validated<RepairEvidenceUploadInput>(req, 'body');

  const repair: Repair = await repairService.addEvidence(id, repairer, 'after', input);
  res.status(200).json(repair);
});

/** POST /api/repairs/:id/verify — resident verdict on the evidence. */
export const verifyRepair: RequestHandler = asyncHandler(async (req, res) => {
  const actor = requireUser(req);
  const { id } = validated<{ id: string }>(req, 'params');
  const { verdict, note } = validated<RepairVerificationInput>(req, 'body');

  const repair: Repair = await repairService.verify(id, actor, verdict, note);
  res.status(200).json(repair);
});

/** GET /api/potholes/:idOrHumanCode/repairs — evidence chain, newest first. */
export const listRepairs: RequestHandler = asyncHandler(async (req, res) => {
  const viewer = requireUser(req);
  const { idOrHumanCode } = validated<{ idOrHumanCode: string }>(req, 'params');

  const repairs = await repairService.listForPothole(idOrHumanCode, viewer.sub);
  res.status(200).json(repairs);
});

/**
 * GET /api/repairs/:id/evidence/:stage/photo — 302 to a presigned GET of the
 * before/after evidence, for the resident verification card's comparison view.
 * Any signed-in user: evidence is what citizens are asked to judge.
 */
export const getRepairEvidencePhoto: RequestHandler = asyncHandler(async (req, res) => {
  requireUser(req);
  const { id, stage } = validated<RepairEvidenceParams>(req, 'params');

  const photoKey = await repairService.getEvidencePhotoKey(id, stage);
  await sendPhotoRedirect(res, storageService, photoKey, new NotFoundError('Evidence photo is no longer available'));
});
