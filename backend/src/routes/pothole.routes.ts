import { Router } from 'express';
import { AssignRepairSchema, NearbyPotholeQuerySchema, PotholeListQuerySchema, PotholeStatusUpdateSchema } from 'shared';
import { getPotholeDetail, getPotholePhoto, getNearbyPothole, listPotholes, updatePotholeStatus } from '../controllers/pothole.controller.js';
import { assignRepair, listRepairs } from '../controllers/repair.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { IdOrHumanCodeParamsSchema } from '../schemas/params.js';

/** Mounted at /api/potholes. `/nearby` must be registered before `/:idOrHumanCode`. */
export const potholesRouter = Router();

potholesRouter.get('/nearby', requireAuth, validate({ query: NearbyPotholeQuerySchema }), getNearbyPothole);
potholesRouter.get('/', requireAuth, validate({ query: PotholeListQuerySchema }), listPotholes);
potholesRouter.post(
  '/:idOrHumanCode/repairs',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: IdOrHumanCodeParamsSchema, body: AssignRepairSchema }),
  assignRepair,
);
potholesRouter.get(
  '/:idOrHumanCode/repairs',
  requireAuth,
  validate({ params: IdOrHumanCodeParamsSchema }),
  listRepairs,
);
potholesRouter.get(
  '/:idOrHumanCode',
  requireAuth,
  validate({ params: IdOrHumanCodeParamsSchema }),
  getPotholeDetail,
);
potholesRouter.get(
  '/:idOrHumanCode/photo',
  requireAuth,
  validate({ params: IdOrHumanCodeParamsSchema }),
  getPotholePhoto,
);
potholesRouter.patch(
  '/:idOrHumanCode/status',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: IdOrHumanCodeParamsSchema, body: PotholeStatusUpdateSchema }),
  updatePotholeStatus,
);
