import type { RequestHandler } from 'express';
import type {
  CreateReportInput,
  CreateReportResponse,
  ListReportsQuery,
  ReportStatus,
  StatusUpdateInput,
} from 'shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { NotFoundError } from '../lib/errors.js';
import { sendPhotoRedirect } from '../lib/photo.js';
import { requireUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import { potholeService } from '../services/pothole.service.js';
import { reportService } from '../services/report.service.js';
import { storageService } from '../services/storage.service.js';

/** POST /api/reports — creates a report and lands it on a (new or existing) pothole. */
export const createReport: RequestHandler = asyncHandler(async (req, res) => {
  const session = requireUser(req);
  const input = validated<CreateReportInput>(req, 'body');

  const result: CreateReportResponse = await potholeService.createReport(session.sub, input);
  res.status(201).json(result);
});

/** GET /api/reports — own reports (or all for admins), cursor-paginated. */
export const listReports: RequestHandler = asyncHandler(async (req, res) => {
  const query = validated<ListReportsQuery>(req, 'query');
  const page = await reportService.list(requireUser(req), query);
  res.status(200).json(page);
});

/** GET /api/reports/:id — owner or admin; other citizens get a 404. */
export const getReport: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = validated<{ id: string }>(req, 'params');
  const report = await reportService.getById(requireUser(req), id);
  res.status(200).json(report);
});

/**
 * @deprecated Status now lives on the pothole — use
 * `PATCH /api/potholes/:idOrHumanCode/status`. Kept until the frontend stops
 * calling it: applies the transition to the report's pothole and echoes the
 * pothole's status on the returned report for backwards compatibility.
 */
export const updateReportStatus: RequestHandler = asyncHandler(async (req, res) => {
  const actor = requireUser(req);
  const { id } = validated<{ id: string }>(req, 'params');
  const { status } = validated<StatusUpdateInput>(req, 'body');

  const { report, pothole } = await reportService.updateStatusViaReport(id, actor, status);
  res.status(200).json({ ...report, status: pothole.status satisfies ReportStatus });
});

/**
 * GET /api/reports/:id/photo — 302 to a short-lived presigned GET URL, so detail
 * views can use `<img src="/api/reports/:id/photo">` and the session cookie
 * flows through the Vite proxy. Same visibility rule as `getReport`.
 */
export const getReportPhoto: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = validated<{ id: string }>(req, 'params');
  const report = await reportService.getById(requireUser(req), id);

  await sendPhotoRedirect(res, storageService, report.photoKey, new NotFoundError('Report photo is no longer available'));
});
