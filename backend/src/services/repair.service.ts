/**
 * Repair evidence chain.
 *
 * Akanksha's principle: never record "complaint repaired". Record
 * "this exact location -> before evidence -> repair evidence -> after evidence
 * -> citizen verification". Every claim is GPS-bound (<= REPAIR_GPS_RADIUS_M
 * from the pothole) and time-ordered (afterAt > beforeAt), or it doesn't count.
 *
 * RESOLVED on the pothole is reachable ONLY through a citizen's FIXED verdict.
 */
import type { Prisma, PrismaClient, RepairStatus as PrismaRepairStatus } from '@prisma/client';
import type {
  AssignRepairInput,
  Pothole,
  Repair,
  RepairEvidenceUploadInput,
  RepairStatus,
  RepairVerdict,
  ReportStatus,
} from 'shared';
import { env } from '../lib/env.js';
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableEntityError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { repairInclude, toRepair, type RepairWithRelations } from '../lib/serialize.js';
import type { SessionPayload } from '../lib/jwt.js';
import { haversineMeters } from './pothole.service.js';
import { storageService } from './storage.service.js';

/** A repair is "open" while it could still change the pothole's state. */
const OPEN_REPAIR_STATUSES: PrismaRepairStatus[] = ['ASSIGNED', 'IN_PROGRESS', 'AWAITING_VERIFICATION'];

export class RepairService {
  constructor(private readonly db: PrismaClient) {}

  /** ADMIN: create an ASSIGNED job and move the pothole to IN_PROGRESS. */
  async assign(idOrHumanCode: string, admin: SessionPayload, input: AssignRepairInput): Promise<Repair> {
    return this.db.$transaction(async (tx) => {
      const pothole = await tx.pothole.findFirst({
        where: { OR: [{ id: idOrHumanCode }, { humanCode: idOrHumanCode }] },
      });
      if (!pothole) {
        throw new NotFoundError('Pothole not found');
      }

      const open = await tx.repair.findFirst({
        where: { potholeId: pothole.id, status: { in: OPEN_REPAIR_STATUSES } },
        select: { id: true },
      });
      if (open) {
        throw new ConflictError('This pothole already has an open repair');
      }

      const repair = await tx.repair.create({
        data: {
          potholeId: pothole.id,
          assignedById: admin.sub,
          note: input.note ?? null,
        },
        include: repairInclude,
      });

      await this.setPotholeStatus(tx, pothole.id, pothole.status, 'IN_PROGRESS');
      await tx.potholeEvent.create({
        data: { potholeId: pothole.id, type: 'REPAIR_ASSIGNED', byUserId: admin.sub, note: input.note ?? null },
      });

      return toRepair(repair, admin.sub);
    });
  }

  /** REPAIRER: claim an ASSIGNED job. */
  async pickup(repairId: string, repairer: SessionPayload): Promise<Repair> {
    return this.db.$transaction(async (tx) => {
      const claimed = await tx.repair.updateMany({
        where: { id: repairId, status: 'ASSIGNED' },
        data: { repairerId: repairer.sub, status: 'IN_PROGRESS' },
      });
      if (claimed.count === 0) {
        throw new ConflictError('Repair not found or already picked up');
      }

      const repair = await tx.repair.findUniqueOrThrow({ where: { id: repairId }, include: repairInclude });
      // The pothole is already IN_PROGRESS (assign set it); nothing to change here.
      return toRepair(repair, repairer.sub);
    });
  }

  /**
   * REPAIRER (the assigned one): attach before/after evidence. The GPS gate and
   * the evidence-ordering rule run before the transaction so an S3 existence
   * check never holds a DB transaction open; the transaction re-checks the
   * repair status conditionally, so concurrent submissions cannot both win.
   */
  async addEvidence(
    repairId: string,
    actor: SessionPayload,
    stage: 'before' | 'after',
    input: RepairEvidenceUploadInput,
  ): Promise<Repair> {
    const repair = await this.db.repair.findUnique({
      where: { id: repairId },
      include: { pothole: { select: { id: true, humanCode: true, latitude: true, longitude: true } } },
    });
    if (!repair) {
      throw new NotFoundError('Repair not found');
    }
    if (repair.repairerId !== actor.sub) {
      throw new ForbiddenError('Only the assigned repairer can upload evidence');
    }

    this.assertEvidenceAllowed(repair.status, stage, repair.beforeAt);
    this.assertAtPothole(input, repair.pothole.humanCode, repair.pothole.latitude.toNumber(), repair.pothole.longitude.toNumber());
    if (storageService.isConfigured()) {
      await storageService.assertPhotoExists(input.photoKey, new NotFoundError('Photo not found — upload it first'));
    }

    const now = new Date();
    const evidence =
      stage === 'before'
        ? { status: 'IN_PROGRESS' as const, beforePhoto: input.photoKey, beforeLat: input.latitude, beforeLng: input.longitude, beforeAt: now }
        : { status: 'AWAITING_VERIFICATION' as const, afterPhoto: input.photoKey, afterLat: input.latitude, afterLng: input.longitude, afterAt: now };

    return this.db.$transaction(async (tx) => {
      const acceptedStatuses: PrismaRepairStatus[] = stage === 'before' ? ['ASSIGNED', 'IN_PROGRESS'] : ['IN_PROGRESS'];
      const updated = await tx.repair.updateMany({
        where: { id: repair.id, repairerId: actor.sub, status: { in: acceptedStatuses } },
        data: evidence,
      });
      if (updated.count === 0) {
        throw new ConflictError('Repair state changed — this evidence can no longer be accepted');
      }

      if (stage === 'after') {
        await tx.pothole.update({
          where: { id: repair.potholeId },
          data: { status: 'AWAITING_VERIFICATION' satisfies ReportStatus },
        });
        await tx.potholeEvent.create({
          data: {
            potholeId: repair.potholeId,
            type: 'REPAIR_SUBMITTED',
            byUserId: actor.sub,
            note: 'awaiting citizen verification',
          },
        });
      }

      const fresh = await tx.repair.findUniqueOrThrow({ where: { id: repair.id }, include: repairInclude });
      return toRepair(fresh, actor.sub);
    });
  }

  /**
   * Resident verdict on the evidence. Gate: ADMIN always; everyone else needs at
   * least one report on this pothole. A FIXED verdict resolves the pothole
   * (repairsCount++, lastRepairedAt); NOT_FIXED reopens it. The first verdict
   * decides — after it the repair leaves AWAITING_VERIFICATION and further votes
   * are refused.
   */
  async verify(repairId: string, actor: SessionPayload, verdict: RepairVerdict, note?: string): Promise<Repair> {
    const repair = await this.db.repair.findUnique({
      where: { id: repairId },
      select: { id: true, potholeId: true, status: true, repairerId: true, afterAt: true },
    });
    if (!repair) {
      throw new NotFoundError('Repair not found');
    }
    if (repair.status !== 'AWAITING_VERIFICATION') {
      throw new ConflictError('This repair is not awaiting verification');
    }

    // The crew grading its own work is not verification.
    if (repair.repairerId && repair.repairerId === actor.sub) {
      throw new ForbiddenError('Repairers cannot verify their own repairs');
    }

    if (actor.role !== 'ADMIN') {
      const reported = await this.db.potholeReport.count({
        where: { potholeId: repair.potholeId, reporterId: actor.sub },
      });
      if (reported === 0) {
        throw new ForbiddenError('Only citizens who reported this pothole can verify the repair');
      }
    }

    const alreadyVoted = await this.db.repairVerification.findUnique({
      where: { repairId_userId: { repairId: repair.id, userId: actor.sub } },
      select: { id: true },
    });
    if (alreadyVoted) {
      throw new ConflictError('You have already verified this repair');
    }

    return this.db.$transaction(async (tx) => {
      const decided = await tx.repair.updateMany({
        where: { id: repair.id, status: 'AWAITING_VERIFICATION' },
        data: { status: verdict === 'FIXED' ? 'VERIFIED_FIXED' : 'REOPENED' },
      });
      if (decided.count === 0) {
        throw new ConflictError('This repair is not awaiting verification');
      }

      await tx.repairVerification.create({
        data: { repairId: repair.id, userId: actor.sub, verdict, note: note ?? null },
      });

      if (verdict === 'FIXED') {
        await tx.pothole.update({
          where: { id: repair.potholeId },
          data: {
            status: 'RESOLVED' satisfies ReportStatus,
            repairsCount: { increment: 1 },
            lastRepairedAt: repair.afterAt ?? new Date(),
          },
        });
        await tx.potholeEvent.create({
          data: { potholeId: repair.potholeId, type: 'REPAIR_VERIFIED', byUserId: actor.sub, note: note ?? null },
        });
      } else {
        await tx.pothole.update({
          where: { id: repair.potholeId },
          data: { status: 'REPORTED' satisfies ReportStatus },
        });
        await tx.potholeEvent.create({
          data: {
            potholeId: repair.potholeId,
            type: 'REOPENED',
            byUserId: actor.sub,
            note: `citizen says not fixed${note ? ` — ${note}` : ''}`,
          },
        });
      }

      const fresh = await tx.repair.findUniqueOrThrow({ where: { id: repair.id }, include: repairInclude });
      return toRepair(fresh, actor.sub);
    });
  }

  /** Repairs (with evidence + verdict summary) for the pothole detail page. */
  async listForPothole(idOrHumanCode: string, viewerId?: string): Promise<Repair[]> {
    const pothole = await this.db.pothole.findFirst({
      where: { OR: [{ id: idOrHumanCode }, { humanCode: idOrHumanCode }] },
      select: { id: true },
    });
    if (!pothole) {
      throw new NotFoundError('Pothole not found');
    }

    const repairs: RepairWithRelations[] = await this.db.repair.findMany({
      where: { potholeId: pothole.id },
      include: repairInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return repairs.map((repair) => toRepair(repair, viewerId));
  }

  /** The stage's evidence photo key, for the photo redirect endpoint. */
  async getEvidencePhotoKey(repairId: string, stage: 'before' | 'after'): Promise<string> {
    const repair = await this.db.repair.findUnique({
      where: { id: repairId },
      select: { beforePhoto: true, afterPhoto: true },
    });
    if (!repair) {
      throw new NotFoundError('Repair not found');
    }

    const photoKey = stage === 'before' ? repair.beforePhoto : repair.afterPhoto;
    if (!photoKey) {
      throw new NotFoundError(
        stage === 'before' ? 'Before evidence has not been captured yet' : 'After evidence has not been submitted yet',
      );
    }
    return photoKey;
  }

  private assertEvidenceAllowed(status: PrismaRepairStatus, stage: 'before' | 'after', beforeAt: Date | null): void {
    if (stage === 'before') {
      if (status === 'AWAITING_VERIFICATION' || status === 'VERIFIED_FIXED' || status === 'REOPENED') {
        throw new ConflictError('This repair no longer accepts before evidence');
      }
      return;
    }
    if (status === 'AWAITING_VERIFICATION') {
      throw new ConflictError('After evidence already submitted — awaiting citizen verification');
    }
    if (status !== 'IN_PROGRESS') {
      throw new ConflictError('Pick up the job and capture the before photo first');
    }
    if (!beforeAt) {
      throw new UnprocessableEntityError('Capture the before photo first');
    }
    if (Date.now() <= beforeAt.getTime()) {
      throw new UnprocessableEntityError('After evidence must be captured after the before photo');
    }
  }

  /** Every evidence claim must be captured standing at the pothole. */
  private assertAtPothole(
    input: RepairEvidenceUploadInput,
    humanCode: string,
    potholeLat: number,
    potholeLng: number,
  ): void {
    const distance = haversineMeters(input.latitude, input.longitude, potholeLat, potholeLng);
    if (distance > env.REPAIR_GPS_RADIUS_M) {
      throw new UnprocessableEntityError(
        `You are ${Math.round(distance)} m from pothole #${humanCode} — go stand at the pothole`,
        { distanceMeters: Math.round(distance), limitMeters: env.REPAIR_GPS_RADIUS_M },
      );
    }
  }

  /** Skip the write when the status already matches (avoids pointless updatedAt bumps). */
  private async setPotholeStatus(
    tx: Prisma.TransactionClient,
    potholeId: string,
    current: ReportStatus,
    next: ReportStatus,
  ): Promise<void> {
    if (current !== next) {
      await tx.pothole.update({ where: { id: potholeId }, data: { status: next } });
    }
  }
}

/** Singleton; storage checks run outside transactions. */
export const repairService = new RepairService(prisma);
