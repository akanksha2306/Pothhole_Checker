/**
 * Pothole clustering: locations create potholes.
 *
 * A report is a citizen asserting "this is the same physical pothole"; the
 * Pothole row owns the status and the timeline. All multi-row writes (report +
 * counters + event) happen in a single transaction.
 */
import type { Pothole as PrismaPothole, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  CreateReportInput,
  Pothole,
  PotholeDetail,
  PotholeListQuery,
  PotholeListResponse,
  ReportStatus,
  ReportWithPothole,
} from 'shared';
import { env } from '../lib/env.js';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { potholeSummarySelect, toPothole, toPotholeEvent, toPotholeListItem, toPotholeReport, toReportHistoryItem } from '../lib/serialize.js';
import { geocodeService, type GeocodeService } from './geocode.service.js';
import { storageService, type StorageService } from './storage.service.js';

const EARTH_RADIUS_M = 6_371_000;
/** Approximate metres per degree of latitude, for bounding-box math. */
const METERS_PER_DEGREE_LAT = 111_320;
/** A report may only be attached to a pothole within this distance. */
export const MAX_ATTACH_DISTANCE_M = 200;
/** Timeline / history size cap for the detail endpoint. */
const DETAIL_HISTORY_LIMIT = 100;

/** Nearest-pothole match, distance rounded to a tenth of a metre. */
export interface NearbyPothole {
  pothole: Pothole;
  distanceMeters: number;
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export class PotholeService {
  constructor(
    private readonly db: PrismaClient,
    private readonly geocode: GeocodeService,
    private readonly storage?: StorageService,
  ) {}

  /** Nearest pothole within `radiusM` of the point, or null. */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusM: number = env.NEARBY_RADIUS_M,
  ): Promise<NearbyPothole | null> {
    // Cheap bounding-box prefilter in SQL (2x the radius to absorb GPS jitter),
    // then the accurate haversine check in JS over the few candidates.
    const deltaLat = (radiusM * 2) / METERS_PER_DEGREE_LAT;
    const cosLat = Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
    const deltaLng = deltaLat / cosLat;

    const candidates: PrismaPothole[] = await this.db.pothole.findMany({
      where: {
        latitude: { gte: latitude - deltaLat, lte: latitude + deltaLat },
        longitude: { gte: longitude - deltaLng, lte: longitude + deltaLng },
      },
    });

    let best: { pothole: PrismaPothole; distance: number } | null = null;
    for (const candidate of candidates) {
      const distance = haversineMeters(
        latitude,
        longitude,
        candidate.latitude.toNumber(),
        candidate.longitude.toNumber(),
      );
      if (distance <= radiusM && (best === null || distance < best.distance)) {
        best = { pothole: candidate, distance };
      }
    }

    if (!best) return null;
    return { pothole: toPothole(best.pothole), distanceMeters: Math.round(best.distance * 10) / 10 };
  }

  /**
   * Creates a report and lands it on a pothole.
   * - `potholeId` given: validates distance (<= 200 m), bumps counters, and flips
   *   a RESOLVED pothole back to REPORTED (event REPORTED_AGAIN).
   * - `potholeId` omitted: creates a NEW pothole (sequence -> humanCode,
   *   reverse-geocoded street). The geocode call runs before the transaction so
   *   it never holds a DB transaction open for its 3s timeout.
   */
  async createReport(userId: string, input: CreateReportInput): Promise<{ report: ReportWithPothole; pothole: Pothole }> {
    // Only verifies the upload when R2 is configured; placeholder envs skip it.
    if (this.storage?.isConfigured()) {
      await this.storage.assertPhotoExists(input.photoKey);
    }

    const streetName = input.potholeId ? null : await this.geocode.reverseGeocode(input.latitude, input.longitude);

    return this.db.$transaction(async (tx) => {
      let pothole: PrismaPothole;
      let eventType: 'REPORTED' | 'REPORTED_AGAIN';

      if (input.potholeId) {
        const existing = await tx.pothole.findUnique({ where: { id: input.potholeId } });
        if (!existing) {
          throw new BadRequestError('potholeId does not reference an existing pothole');
        }
        const distance = haversineMeters(
          input.latitude,
          input.longitude,
          existing.latitude.toNumber(),
          existing.longitude.toNumber(),
        );
        if (distance > MAX_ATTACH_DISTANCE_M) {
          throw new BadRequestError(
            `Report is ${Math.round(distance)} m from that pothole; reports can only be attached within ${MAX_ATTACH_DISTANCE_M} m`,
          );
        }

        // The app never claims a pothole "came back": a new report on a repaired
        // pothole is just another citizen reporting the same physical pothole.
        const wasResolved = existing.status === 'RESOLVED';
        eventType = wasResolved ? 'REPORTED_AGAIN' : 'REPORTED';

        pothole = await tx.pothole.update({
          where: { id: existing.id },
          data: {
            reportCount: { increment: 1 },
            lastReportedAt: new Date(),
            ...(wasResolved ? { status: 'REPORTED' satisfies ReportStatus } : {}),
          },
        });
      } else {
        eventType = 'REPORTED';
        const now = new Date();
        pothole = await tx.pothole.create({
          data: {
            humanCode: await this.nextHumanCode(tx),
            primaryPhotoKey: input.photoKey,
            latitude: input.latitude,
            longitude: input.longitude,
            streetName,
            status: 'REPORTED',
            reportCount: 1,
            firstReportedAt: now,
            lastReportedAt: now,
          },
        });
      }

      const report = await tx.potholeReport.create({
        data: {
          reporterId: userId,
          potholeId: pothole.id,
          photoKey: input.photoKey,
          latitude: input.latitude,
          longitude: input.longitude,
          description: input.description ?? null,
        },
        include: { reporter: true, pothole: { select: potholeSummarySelect } },
      });

      await tx.potholeEvent.create({
        data: { potholeId: pothole.id, type: eventType, byUserId: userId },
      });

      return { report: toPotholeReport(report), pothole: toPothole(pothole) };
    });
  }

  /** Pothole list (map + list screens). `reports` = most reported, `recent` = newest. */
  async list(query: PotholeListQuery): Promise<PotholeListResponse> {
    const orderBy: Prisma.PotholeOrderByWithRelationInput[] =
      query.sort === 'reports'
        ? [{ reportCount: 'desc' }, { lastReportedAt: 'desc' }, { id: 'desc' }]
        : [{ lastReportedAt: 'desc' }, { id: 'desc' }];

    const rows = await this.db.pothole.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const items = (hasMore ? rows.slice(0, query.limit) : rows).map(toPotholeListItem);

    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  /** Detail by internal id or human code: pothole + timeline + report history. */
  /** Detail without repairs — the caller merges those in (see pothole.controller). */
  async getDetail(idOrHumanCode: string): Promise<Omit<PotholeDetail, 'repairs'>> {
    const pothole = await this.db.pothole.findFirst({
      where: { OR: [{ id: idOrHumanCode }, { humanCode: idOrHumanCode }] },
    });
    if (!pothole) {
      throw new NotFoundError('Pothole not found');
    }

    const [events, reports] = await Promise.all([
      this.db.potholeEvent.findMany({
        where: { potholeId: pothole.id },
        include: { byUser: true },
        orderBy: [{ at: 'desc' }, { id: 'desc' }],
        take: DETAIL_HISTORY_LIMIT,
      }),
      this.db.potholeReport.findMany({
        where: { potholeId: pothole.id },
        include: { reporter: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: DETAIL_HISTORY_LIMIT,
      }),
    ]);

    return {
      pothole: toPothole(pothole),
      events: events.map(toPotholeEvent),
      reports: reports.map(toReportHistoryItem),
    };
  }

  /**
   * Admin status transition. RESOLVED is refused: "repaired" now requires a
   * citizen-verified repair (assign one and let the evidence chain run).
   * Everything else records a STATUS_CHANGED event; setting the status a
   * pothole already has is a no-op.
   */
  async updateStatus(idOrHumanCode: string, actorId: string, status: ReportStatus, note?: string): Promise<Pothole> {
    if (status === 'RESOLVED') {
      throw new ConflictError('Marking repaired requires a verified repair — assign one');
    }

    return this.db.$transaction(async (tx) => {
      const pothole = await tx.pothole.findFirst({
        where: { OR: [{ id: idOrHumanCode }, { humanCode: idOrHumanCode }] },
      });
      if (!pothole) {
        throw new NotFoundError('Pothole not found');
      }
      if (pothole.status === status) {
        return toPothole(pothole);
      }

      const updated = await tx.pothole.update({
        where: { id: pothole.id },
        data: { status },
      });

      await tx.potholeEvent.create({
        data: { potholeId: pothole.id, type: 'STATUS_CHANGED', byUserId: actorId, note: note ?? null },
      });

      return toPothole(updated);
    });
  }

  /** The pothole's primary photo object key, for the photo redirect endpoint. */
  async getPrimaryPhotoKey(idOrHumanCode: string): Promise<string> {
    const pothole = await this.db.pothole.findFirst({
      where: { OR: [{ id: idOrHumanCode }, { humanCode: idOrHumanCode }] },
      select: { primaryPhotoKey: true },
    });
    if (!pothole) {
      throw new NotFoundError('Pothole not found');
    }
    return pothole.primaryPhotoKey;
  }

  /** `BLR-00001` from pothole_human_code_seq; sequences are race-free. */
  private async nextHumanCode(tx: Prisma.TransactionClient): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ nextval: bigint | number | string }>>(
      Prisma.sql`SELECT nextval('pothole_human_code_seq') AS nextval`,
    );
    const raw = rows.at(0)?.nextval ?? 0;
    return `${env.CITY_CODE}-${String(Number(raw)).padStart(5, '0')}`;
  }
}

/** Singleton wired with the reverse geocoder and (optional) photo storage. */
export const potholeService = new PotholeService(prisma, geocodeService, storageService);
