/**
 * PotholeWatch — shared API contract.
 *
 * Source of truth for request/response shapes, authored by the backend and
 * consumed by the frontend. Schemas describe the JSON *wire* format, so
 * timestamps are ISO-8601 strings (what `JSON.stringify` emits for a `Date`).
 *
 * Core concept: many citizens' REPORTS roll up into ONE POTHOLE per physical
 * location. The pothole owns the status and the timeline; a report is a citizen
 * asserting "this is the same physical pothole". A repaired pothole that gets a
 * new report flips back to REPORTED (event REPORTED_AGAIN) while its repair
 * history (repairsCount, lastRepairedAt) is preserved.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ enums */

/** Role on the single User model. Admins and repairers come from email allowlists. */
export const RoleEnum = z.enum(['CITIZEN', 'REPAIRER', 'ADMIN']);
export type Role = z.infer<typeof RoleEnum>;

/** Current state of a pothole (not of a report — reports are assertions).
 *  RESOLVED is only reachable through citizen verification of a repair. */
export const ReportStatusEnum = z.enum([
  'REPORTED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'AWAITING_VERIFICATION',
  'RESOLVED',
]);
export type ReportStatus = z.infer<typeof ReportStatusEnum>;

/** Timeline entries on a pothole. REPORTED_AGAIN, deliberately never "reopened". */
export const PotholeEventTypeEnum = z.enum([
  'REPORTED',
  'REPAIRED',
  'REPORTED_AGAIN',
  'STATUS_CHANGED',
  'REPAIR_ASSIGNED',
  'REPAIR_SUBMITTED',
  'REPAIR_VERIFIED',
  'REOPENED',
]);
export type PotholeEventType = z.infer<typeof PotholeEventTypeEnum>;

/** Lifecycle of a single repair job. */
export const RepairStatusEnum = z.enum([
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_VERIFICATION',
  'VERIFIED_FIXED',
  'REOPENED',
]);
export type RepairStatus = z.infer<typeof RepairStatusEnum>;

/** A resident's verdict on repair evidence. */
export const RepairVerdictEnum = z.enum(['FIXED', 'NOT_FIXED']);
export type RepairVerdict = z.infer<typeof RepairVerdictEnum>;

/* --------------------------------------------------------------- primitives */

/** ISO-8601 UTC timestamp as it appears on the wire. */
export const IsoDateTime = z.string().datetime();

/** Geographic latitude, decimal degrees. */
export const LatitudeSchema = z.number().min(-90, 'latitude must be >= -90').max(90, 'latitude must be <= 90');

/** Geographic longitude, decimal degrees. */
export const LongitudeSchema = z.number().min(-180, 'longitude must be >= -180').max(180, 'longitude must be <= 180');

/** Distance in metres, rounded to whole metres. */
export const DistanceMetersSchema = z.number().nonnegative();

/* ---------------------------------------------------------------- entities */

/** Public user shape — deliberately excludes googleId and any other private claims. */
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  role: RoleEnum,
  createdAt: IsoDateTime,
});
export type User = z.infer<typeof UserSchema>;

/** The pothole fields shown alongside a report (report list/detail). */
export const PotholeSummarySchema = z.object({
  id: z.string().min(1),
  humanCode: z.string().min(1),
  status: ReportStatusEnum,
  reportCount: z.number().int().positive(),
  streetName: z.string().nullable(),
});
export type PotholeSummary = z.infer<typeof PotholeSummarySchema>;

/** A pothole report as returned by the API. */
export const PotholeReportSchema = z.object({
  id: z.string().min(1),
  reporterId: z.string().min(1),
  potholeId: z.string().min(1),
  /** Denormalised reporter so list views don't need a second round-trip. */
  reporter: UserSchema,
  /** R2 object key of the uploaded photo (not a public URL). */
  photoKey: z.string().min(1).max(512),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  description: z.string().max(2000).nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type PotholeReport = z.infer<typeof PotholeReportSchema>;

/** A report plus the summary of the pothole it belongs to. */
export const ReportWithPotholeSchema = PotholeReportSchema.extend({
  pothole: PotholeSummarySchema,
});
export type ReportWithPothole = z.infer<typeof ReportWithPotholeSchema>;

/** A pothole: the physical location, its current status and its counters. */
export const PotholeSchema = z.object({
  id: z.string().min(1),
  /** Public, human-friendly code (BLR-00001). */
  humanCode: z.string().min(1),
  primaryPhotoKey: z.string().min(1),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  /** Reverse-geocoded street, null when Nominatim had no answer. */
  streetName: z.string().nullable(),
  status: ReportStatusEnum,
  reportCount: z.number().int().nonnegative(),
  repairsCount: z.number().int().nonnegative(),
  /** How many people flagged this pothole as mattering. */
  upvoteCount: z.number().int().nonnegative(),
  /** Whether the requesting user has upvoted (viewer-scoped). */
  myUpvote: z.boolean(),
  firstReportedAt: IsoDateTime,
  lastReportedAt: IsoDateTime,
  lastRepairedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Pothole = z.infer<typeof PotholeSchema>;

/** Row of the pothole list screen (map + list). Leaner than PotholeSchema.
 *  Deliberately no per-viewer myUpvote — the list is not viewer-scoped. */
export const PotholeListItemSchema = z.object({
  id: z.string().min(1),
  humanCode: z.string().min(1),
  primaryPhotoKey: z.string().min(1),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  streetName: z.string().nullable(),
  status: ReportStatusEnum,
  reportCount: z.number().int().nonnegative(),
  repairsCount: z.number().int().nonnegative(),
  upvoteCount: z.number().int().nonnegative(),
  lastReportedAt: IsoDateTime,
});
export type PotholeListItem = z.infer<typeof PotholeListItemSchema>;

/** Actor of a timeline event — only what the UI needs to render an avatar. */
export const PotholeEventActorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
});
export type PotholeEventActor = z.infer<typeof PotholeEventActorSchema>;

/** One timeline entry on a pothole. */
export const PotholeEventSchema = z.object({
  id: z.string().min(1),
  type: PotholeEventTypeEnum,
  at: IsoDateTime,
  note: z.string().max(500).nullable(),
  byUser: PotholeEventActorSchema.nullable(),
});
export type PotholeEvent = z.infer<typeof PotholeEventSchema>;

/* ----------------------------------------------------------------- repairs */

/** A GPS-and-time-stamped evidence item captured at the pothole. */
export const RepairEvidenceSchema = z.object({
  photoKey: z.string().min(1),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  at: IsoDateTime,
});
export type RepairEvidence = z.infer<typeof RepairEvidenceSchema>;

/** Aggregate of the residents' verdicts on one repair. */
export const RepairVerificationSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  fixed: z.number().int().nonnegative(),
  notFixed: z.number().int().nonnegative(),
  /** The requesting user's own verdict, null if they have not voted. */
  myVerdict: RepairVerdictEnum.nullable(),
});
export type RepairVerificationSummary = z.infer<typeof RepairVerificationSummarySchema>;

/** A repair job with its evidence chain (coords as numbers, ISO times). */
export const RepairSchema = z.object({
  id: z.string().min(1),
  potholeId: z.string().min(1),
  status: RepairStatusEnum,
  assignedBy: UserSchema,
  repairer: UserSchema.nullable(),
  note: z.string().max(500).nullable(),
  before: RepairEvidenceSchema.nullable(),
  after: RepairEvidenceSchema.nullable(),
  verifications: RepairVerificationSummarySchema,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Repair = z.infer<typeof RepairSchema>;

/** One row of a pothole's report history, newest first. */
export const ReportHistoryItemSchema = z.object({
  id: z.string().min(1),
  photoKey: z.string().min(1),
  reporter: UserSchema,
  description: z.string().max(2000).nullable(),
  createdAt: IsoDateTime,
});
export type ReportHistoryItem = z.infer<typeof ReportHistoryItemSchema>;

/** Pothole detail: the pothole, timeline, report history and repair evidence. */
export const PotholeDetailSchema = z.object({
  pothole: PotholeSchema,
  events: z.array(PotholeEventSchema),
  reports: z.array(ReportHistoryItemSchema),
  repairs: z.array(RepairSchema),
});
export type PotholeDetail = z.infer<typeof PotholeDetailSchema>;

/* ---------------------------------------------------------------- requests */

/** POST /api/reports — `photoKey` comes from the presigned-upload flow. */
export const CreateReportSchema = z.object({
  photoKey: z.string().min(1, 'photoKey is required').max(512),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  description: z.string().max(2000, 'description must be at most 2000 characters').optional(),
  /**
   * Optional: attach this report to an existing pothole (from the nearby
   * lookup). When omitted the backend creates a NEW pothole. Must be within
   * 200 m of the report coordinates.
   */
  potholeId: z.string().min(1).optional(),
});
export type CreateReportInput = z.infer<typeof CreateReportSchema>;

/** Response of POST /api/reports — the report plus the pothole it landed on. */
export const CreateReportResponseSchema = z.object({
  report: ReportWithPotholeSchema,
  pothole: PotholeSchema,
});
export type CreateReportResponse = z.infer<typeof CreateReportResponseSchema>;

/** PATCH /api/reports/:id/status — deprecated shim, admin only. */
export const StatusUpdateSchema = z.object({
  status: ReportStatusEnum,
});
export type StatusUpdateInput = z.infer<typeof StatusUpdateSchema>;

/** PATCH /api/potholes/:idOrHumanCode/status — admin only. RESOLVED is refused:
 *  marking repaired requires a citizen-verified repair. */
export const PotholeStatusUpdateSchema = z.object({
  status: ReportStatusEnum,
  /** Free-text note stored on the timeline event (e.g. "acked by ward office"). */
  note: z.string().max(500, 'note must be at most 500 characters').optional(),
});
export type PotholeStatusUpdateInput = z.infer<typeof PotholeStatusUpdateSchema>;

/** POST /api/potholes/:idOrHumanCode/repairs — admin assigns a repair job. */
export const AssignRepairSchema = z.object({
  /** Contractor / crew reference or remark, stored with the job and the event. */
  note: z.string().max(500, 'note must be at most 500 characters').optional(),
});
export type AssignRepairInput = z.infer<typeof AssignRepairSchema>;

/** POST /api/repairs/:id/before-photo and /after-photo — captured at shutter time. */
export const RepairEvidenceUploadSchema = z.object({
  photoKey: z.string().min(1, 'photoKey is required').max(512),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
});
export type RepairEvidenceUploadInput = z.infer<typeof RepairEvidenceUploadSchema>;

/** POST /api/repairs/:id/verify — a resident's verdict on the evidence. */
export const RepairVerificationRequestSchema = z.object({
  verdict: RepairVerdictEnum,
  note: z.string().max(500, 'note must be at most 500 characters').optional(),
});
export type RepairVerificationInput = z.infer<typeof RepairVerificationRequestSchema>;

/** GET /api/potholes/nearby query string. */
export const NearbyPotholeQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type NearbyPotholeQuery = z.infer<typeof NearbyPotholeQuerySchema>;

/** GET /api/potholes/nearby-area query string. */
export const NearbyAreaQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type NearbyAreaQuery = z.infer<typeof NearbyAreaQuerySchema>;

/** One pothole within the area radius, with its distance from the point.
 *  Viewer-scoped: `myUpvote` reflects the requesting user. */
export const PotholeAreaItemSchema = z.object({
  id: z.string().min(1),
  humanCode: z.string().min(1),
  primaryPhotoKey: z.string().min(1),
  streetName: z.string().nullable(),
  status: ReportStatusEnum,
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  distanceMeters: DistanceMetersSchema,
  reportCount: z.number().int().nonnegative(),
  upvoteCount: z.number().int().nonnegative(),
  myUpvote: z.boolean(),
});
export type PotholeAreaItem = z.infer<typeof PotholeAreaItemSchema>;

/** GET /api/potholes/nearby-area — `total` counts everything in radius;
 *  `items` is the capped nearest-first list (so the UI can say "8 within 2 km"). */
export const NearbyAreaResponseSchema = z.object({
  items: z.array(PotholeAreaItemSchema),
  total: z.number().int().nonnegative(),
});
export type NearbyAreaResponse = z.infer<typeof NearbyAreaResponseSchema>;

/** POST /api/potholes/:idOrHumanCode/upvote — toggle result. */
export const PotholeUpvoteToggleResponseSchema = z.object({
  upvoted: z.boolean(),
  upvoteCount: z.number().int().nonnegative(),
});
export type PotholeUpvoteToggleResponse = z.infer<typeof PotholeUpvoteToggleResponseSchema>;

/** GET /api/potholes query string. `limit` arrives as a string over HTTP. */
export const PotholeListQuerySchema = z.object({
  status: ReportStatusEnum.optional(),
  /** `reports` = most reported first, `recent` = newest activity first (default). */
  sort: z.enum(['reports', 'recent']).default('recent'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** Opaque cursor: the `nextCursor` value from the previous page. */
  cursor: z.string().min(1).optional(),
});
export type PotholeListQuery = z.infer<typeof PotholeListQuerySchema>;

/** GET /api/reports query string (filters on the report's pothole status). */
export const ListReportsQuerySchema = z.object({
  status: ReportStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
});
export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;

/* --------------------------------------------------------------- responses */

/** GET /api/potholes/nearby — the pothole within radius, or null. */
export const NearbyPotholeResponseSchema = z.object({
  pothole: PotholeSchema.nullable(),
  /** Present when a pothole was matched. */
  distanceMeters: DistanceMetersSchema.optional(),
});
export type NearbyPotholeResponse = z.infer<typeof NearbyPotholeResponseSchema>;

/** GET /api/potholes — cursor-paginated list. */
export const PotholeListResponseSchema = z.object({
  items: z.array(PotholeListItemSchema),
  /** Pass as `?cursor=` for the next page; null when exhausted. */
  nextCursor: z.string().nullable(),
});
export type PotholeListResponse = z.infer<typeof PotholeListResponseSchema>;

/** GET /api/reports — cursor-paginated list with pothole summaries. */
export const ReportsPageSchema = z.object({
  items: z.array(ReportWithPotholeSchema),
  /** Pass as `?cursor=` for the next page; null when exhausted. */
  nextCursor: z.string().nullable(),
});
export type ReportsPage = z.infer<typeof ReportsPageSchema>;

/** Response of POST /api/uploads/photo — the client PUTs the file to `uploadUrl`. */
export const PhotoUploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  /** Object key to send as `photoKey` when creating the report. */
  key: z.string().min(1),
  /** Seconds until the presigned URL expires. */
  expiresIn: z.number().int().positive(),
});
export type PhotoUploadUrlResponse = z.infer<typeof PhotoUploadUrlResponseSchema>;

/** MIME types accepted for report photos (also the `<input accept>` list). */
export const PhotoContentTypeEnum = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
export type PhotoContentType = z.infer<typeof PhotoContentTypeEnum>;

/** POST /api/uploads/photo — asks the backend for a presigned PUT URL. */
export const PhotoUploadRequestSchema = z.object({
  contentType: PhotoContentTypeEnum,
});
export type PhotoUploadRequest = z.infer<typeof PhotoUploadRequestSchema>;

/** Which door the user came in through on the login page. Enforced server-side:
 *  MUNICIPALITY requires an ADMIN or REPAIRER allowlisted account. */
export const LoginIntentEnum = z.enum(['RESIDENT', 'MUNICIPALITY']);
export type LoginIntent = z.infer<typeof LoginIntentEnum>;

/** POST /api/auth/google — Google Identity Services ID token. */
export const GoogleAuthRequestSchema = z.object({
  credential: z.string().min(1, 'credential is required'),
  /** Defaults to RESIDENT; never trusted from the UI alone. */
  intent: LoginIntentEnum.default('RESIDENT'),
});
export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>;

/** Generic success body, e.g. `POST /api/auth/logout` and `GET /api/health`. */
export const OkResponseSchema = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponseSchema>;

/** Machine-readable error codes, mirrored by the backend's error handler. */
export const ApiErrorCodeEnum = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeEnum>;

/** Consistent error envelope: `{ error: { message, code, details? } }`. */
export const ApiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: ApiErrorCodeEnum,
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
