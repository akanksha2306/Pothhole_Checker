import { Router } from 'express';
import { RepairEvidenceUploadSchema, RepairVerificationRequestSchema } from 'shared';
import {
  addAfterPhoto,
  addBeforePhoto,
  getRepairEvidencePhoto,
  pickupRepair,
  verifyRepair,
} from '../controllers/repair.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { RepairEvidenceParamsSchema, RepairIdParamsSchema } from '../schemas/params.js';

/**
 * Mounted at /api/repairs. Evidence endpoints are REPAIRER-only; verification is
 * open to any signed-in user (the resident gate lives in the service).
 */
export const repairsRouter = Router();

repairsRouter.post('/:id/pickup', requireAuth, requireRole('REPAIRER'), validate({ params: RepairIdParamsSchema }), pickupRepair);
repairsRouter.post(
  '/:id/before-photo',
  requireAuth,
  requireRole('REPAIRER'),
  validate({ params: RepairIdParamsSchema, body: RepairEvidenceUploadSchema }),
  addBeforePhoto,
);
repairsRouter.post(
  '/:id/after-photo',
  requireAuth,
  requireRole('REPAIRER'),
  validate({ params: RepairIdParamsSchema, body: RepairEvidenceUploadSchema }),
  addAfterPhoto,
);
repairsRouter.post(
  '/:id/verify',
  requireAuth,
  validate({ params: RepairIdParamsSchema, body: RepairVerificationRequestSchema }),
  verifyRepair,
);
repairsRouter.get(
  '/:id/evidence/:stage/photo',
  requireAuth,
  validate({ params: RepairEvidenceParamsSchema }),
  getRepairEvidencePhoto,
);
