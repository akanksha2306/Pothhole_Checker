/**
 * Pothole report queries, scoped by role.
 *
 * Reports no longer own a status — the pothole does — so creation and status
 * changes live in PotholeService. The one exception is the deprecated status
 * shim below, kept only until the frontend stops calling it.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  ListReportsQuery,
  Pothole,
  ReportStatus,
  ReportWithPothole,
  ReportsPage,
} from 'shared';
import type { SessionPayload } from '../lib/jwt.js';
import { NotFoundError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { potholeSummarySelect, toPotholeReport } from '../lib/serialize.js';
import { potholeService, type PotholeService } from './pothole.service.js';

export class ReportService {
  constructor(
    private readonly db: PrismaClient,
    private readonly potholes: PotholeService,
  ) {}

  /** CITIZEN: own reports. ADMIN: all. Optional `?status` filter is applied on the pothole. */
  async list(viewer: SessionPayload, query: ListReportsQuery): Promise<ReportsPage> {
    const where: Prisma.PotholeReportWhereInput = {
      ...(viewer.role === 'ADMIN' ? {} : { reporterId: viewer.sub }),
      ...(query.status ? { pothole: { status: query.status } } : {}),
    };

    // Take one extra row to know whether a next page exists.
    const rows = await this.db.potholeReport.findMany({
      where,
      include: { reporter: true, pothole: { select: potholeSummarySelect } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const items = pageRows.map(toPotholeReport);

    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  /**
   * 404 (not 403) when a citizen asks for someone else's report, so
   * existence is never leaked.
   */
  async getById(viewer: SessionPayload, id: string): Promise<ReportWithPothole> {
    const report = await this.db.potholeReport.findUnique({
      where: { id },
      include: { reporter: true, pothole: { select: potholeSummarySelect } },
    });

    if (!report || (viewer.role !== 'ADMIN' && report.reporterId !== viewer.sub)) {
      throw new NotFoundError('Report not found');
    }

    return toPotholeReport(report);
  }

  /**
   * @deprecated Status now lives on the pothole. Kept as a thin shim so the
   * current frontend keeps working; applies the transition to the report's
   * pothole and echoes the pothole's status on the report for compatibility.
   * Remove together with `PATCH /api/reports/:id/status`.
   */
  async updateStatusViaReport(
    reportId: string,
    actor: SessionPayload,
    status: ReportStatus,
    note?: string,
  ): Promise<{ report: ReportWithPothole; pothole: Pothole }> {
    const report = await this.db.potholeReport.findUnique({
      where: { id: reportId },
      select: { potholeId: true },
    });
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const pothole = await this.potholes.updateStatus(report.potholeId, actor.sub, status, note);

    const fresh = await this.db.potholeReport.findUnique({
      where: { id: reportId },
      include: { reporter: true, pothole: { select: potholeSummarySelect } },
    });
    if (!fresh) {
      throw new NotFoundError('Report not found');
    }

    return { report: toPotholeReport(fresh), pothole };
  }
}

/** Singleton wired with the pothole service (status + clustering owner). */
export const reportService = new ReportService(prisma, potholeService);
