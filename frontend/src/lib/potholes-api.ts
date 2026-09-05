import {
  CreateReportResponseSchema,
  RepairSchema,
  RepairVerificationRequestSchema,
  CreateReportSchema,
  ListReportsQuerySchema,
  NearbyPotholeQuerySchema,
  NearbyPotholeResponseSchema,
  PotholeDetailSchema,
  PotholeListQuerySchema,
  PotholeListResponseSchema,
  PotholeStatusUpdateSchema,
  ReportsPageSchema,
  type CreateReportInput,
  type CreateReportResponse,
  type NearbyPotholeResponse,
  type PotholeDetail,
  type PotholeListResponse,
  type PotholeStatusUpdateInput,
  type Repair,
  type RepairVerdict,
  type ReportsPage,
} from 'shared'

import { apiClient, type ApiClient } from '@/lib/api'

export type PotholeSort = 'reports' | 'recent'

/** Filter keys used by the map + list UIs; 'ALL' means no status param. */
export type PotholeFilterKey =
  | 'ALL'
  | 'REPORTED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'AWAITING_VERIFICATION'
  | 'RESOLVED'

/**
 * Pothole-centric endpoint surface. A pothole is the primary entity and reports
 * attach to it; status lives on the pothole and changes via
 * PATCH /potholes/:idOrHumanCode/status (admin). The deprecated
 * PATCH /reports/:id/status shim is deliberately not called anywhere.
 */
export class PotholesApi {
  private readonly client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  /** Cursor-paginated pothole feed, most-reported first by default. */
  list(
    query: { status?: string; sort?: PotholeSort; cursor?: string; limit?: number } = {},
  ): Promise<PotholeListResponse> {
    const parsed = PotholeListQuerySchema.parse({
      ...(query.status ? { status: query.status } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(query.sort ? { sort: query.sort } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
    })

    const params = new URLSearchParams()
    if (parsed.status) params.set('status', parsed.status)
    params.set('sort', parsed.sort)
    params.set('limit', String(parsed.limit))
    if (parsed.cursor) params.set('cursor', parsed.cursor)

    return this.client.get<PotholeListResponse>(`/potholes?${params.toString()}`, (value) =>
      PotholeListResponseSchema.parse(value),
    )
  }

  /** Accepts a UUID or a humanCode like BLR-03821. */
  get(idOrHumanCode: string): Promise<PotholeDetail> {
    return this.client.get<PotholeDetail>(
      `/potholes/${encodeURIComponent(idOrHumanCode)}`,
      (value) => PotholeDetailSchema.parse(value),
    )
  }

  /** Closest pothole to a point (server-side radius). Null when none is close. */
  nearby(latitude: number, longitude: number): Promise<NearbyPotholeResponse> {
    const query = NearbyPotholeQuerySchema.parse({ latitude, longitude })
    const params = new URLSearchParams({
      latitude: String(query.latitude),
      longitude: String(query.longitude),
    })
    return this.client.get<NearbyPotholeResponse>(`/potholes/nearby?${params.toString()}`, (value) =>
      NearbyPotholeResponseSchema.parse(value),
    )
  }

  /** Admin: move a pothole along its lifecycle. */
  updateStatus(idOrHumanCode: string, input: PotholeStatusUpdateInput): Promise<PotholeDetail> {
    const body = PotholeStatusUpdateSchema.parse(input)
    return this.client.patch<PotholeDetail>(
      `/potholes/${encodeURIComponent(idOrHumanCode)}/status`,
      body,
      (value) => PotholeDetailSchema.parse(value),
    )
  }

  /** Citizen: attach a report to an existing pothole, or file a new one. */
  createReport(input: CreateReportInput): Promise<CreateReportResponse> {
    const body = CreateReportSchema.parse(input)
    return this.client.post<CreateReportResponse>('/reports', body, (value) =>
      CreateReportResponseSchema.parse(value),
    )
  }

  /**
   * Admin: put a crew on this pothole. Returns the new repair (status ASSIGNED).
   */
  assignRepair(idOrHumanCode: string, note?: string): Promise<Repair> {
    const body = note && note.trim().length > 0 ? { note: note.trim() } : {}
    return this.client.post<Repair>(
      `/potholes/${encodeURIComponent(idOrHumanCode)}/repairs`,
      body,
      (value) => RepairSchema.parse(value),
    )
  }

  /** Evidence chain for a pothole, newest first. PotholeDetail.repairs mirrors it. */
  listRepairs(idOrHumanCode: string): Promise<Repair[]> {
    return this.client.get<Repair[]>(
      `/potholes/${encodeURIComponent(idOrHumanCode)}/repairs`,
      (value) => RepairSchema.array().parse(value),
    )
  }

  /** Repairer: claim an ASSIGNED job. */
  pickupRepair(repairId: string): Promise<Repair> {
    return this.client.post<Repair>(`/repairs/${encodeURIComponent(repairId)}/pickup`, undefined, (value) =>
      RepairSchema.parse(value),
    )
  }

  /**
   * Repairer: attach GPS-bound before/after evidence. The after upload is what
   * moves the repair to AWAITING_VERIFICATION. GPS/time violations answer 422
   * with an integrity message — surface it verbatim.
   */
  addRepairEvidence(
    repairId: string,
    kind: 'before' | 'after',
    input: { photoKey: string; latitude: number; longitude: number },
  ): Promise<Repair> {
    const path =
      kind === 'before'
        ? `/repairs/${encodeURIComponent(repairId)}/before-photo`
        : `/repairs/${encodeURIComponent(repairId)}/after-photo`
    return this.client.post<Repair>(path, input, (value) => RepairSchema.parse(value))
  }

  /** Resident (or admin) verdict on the evidence. 409 once verification closes. */
  verifyRepair(repairId: string, verdict: RepairVerdict, note?: string): Promise<Repair> {
    const body = RepairVerificationRequestSchema.parse({
      verdict,
      ...(note && note.trim().length > 0 ? { note: note.trim() } : {}),
    })
    return this.client.post<Repair>(`/repairs/${encodeURIComponent(repairId)}/verify`, body, (value) =>
      RepairSchema.parse(value),
    )
  }

  /** Citizen: the signed-in user's reports, each carrying its pothole summary. */
  listMyReports(query: { status?: string; cursor?: string; limit?: number } = {}): Promise<ReportsPage> {
    const parsed = ListReportsQuerySchema.parse({
      ...(query.status ? { status: query.status } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
    })

    const params = new URLSearchParams()
    if (parsed.status) params.set('status', parsed.status)
    if (parsed.cursor) params.set('cursor', parsed.cursor)
    params.set('limit', String(parsed.limit))

    return this.client.get<ReportsPage>(`/reports?${params.toString()}`, (value) =>
      ReportsPageSchema.parse(value),
    )
  }
}

export const potholesApi = new PotholesApi(apiClient)
