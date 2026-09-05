import { Router } from 'express';
import { CreateReportSchema, ListReportsQuerySchema, StatusUpdateSchema } from 'shared';
import {
  createReport,
  getReport,
  getReportPhoto,
  listReports,
  updateReportStatus,
} from '../controllers/report.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ReportIdParamsSchema } from '../schemas/params.js';

/** Mounted at /api/reports. */
export const reportsRouter = Router();

reportsRouter.post(
  '/',
  requireAuth,
  validate({ body: CreateReportSchema }),
  createReport,
);

reportsRouter.get('/', requireAuth, validate({ query: ListReportsQuerySchema }), listReports);
reportsRouter.get('/:id', requireAuth, validate({ params: ReportIdParamsSchema }), getReport);
reportsRouter.get('/:id/photo', requireAuth, validate({ params: ReportIdParamsSchema }), getReportPhoto);
// @deprecated — status lives on the pothole now; use /api/potholes/:idOrHumanCode/status.
// Kept so the current frontend keeps working until the next frontend batch removes it.
reportsRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: ReportIdParamsSchema, body: StatusUpdateSchema }),
  updateReportStatus,
);
