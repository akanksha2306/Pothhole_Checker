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
 * Mounted at /api/repairs. Evidence endpoints are for the assigned repairer
 * (ADMINs may claim jobs too — in small municipalities the admin IS the crew);
 * verification is open to any signed-in user (the resident gate lives in the
 * service).
 */
export const repairsRouter = Router();

// Small-municipality reality: the admin is often the crew, so admins can claim jobs.
repairsRouter.post(
  '/:id/pickup',
  requireAuth,
  requireRole('REPAIRER', 'ADMIN'),
  validate({ params: RepairIdParamsSchema }),
  pickupRepair,
);
repairsRouter.post(
  '/:id/before-photo',
  requireAuth,
  requireRole('REPAIRER', 'ADMIN'),
  validate({ params: RepairIdParamsSchema, body: RepairEvidenceUploadSchema }),
  addBeforePhoto,
);
repairsRouter.post(
  '/:id/after-photo',
  requireAuth,
  requireRole('REPAIRER', 'ADMIN'),
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
