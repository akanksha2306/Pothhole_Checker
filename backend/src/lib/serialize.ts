/**
 * Prisma model -> shared API contract mappers.
 *
 * This is the only place where DB shapes and wire shapes meet: Prisma returns
 * `Date` objects and `Decimal` instances, while the shared contract (and JSON)
 * uses ISO-8601 strings and plain numbers.
 */
import type {
  Pothole as PrismaPothole,
  PotholeEvent as PrismaPotholeEvent,
  PotholeReport as PrismaPotholeReport,
  Prisma,
  Repair as PrismaRepair,
  User as PrismaUser,
} from '@prisma/client';
import type {
  Pothole,
  PotholeEvent,
  PotholeEventActor,
  PotholeListItem,
  PotholeSummary,
  Repair,
  RepairEvidence,
  ReportHistoryItem,
  ReportWithPothole,
  User,
} from 'shared';

/** The pothole fields embedded in a report payload. */
export const potholeSummarySelect = {
  id: true,
  humanCode: true,
  status: true,
  reportCount: true,
  streetName: true,
} satisfies Prisma.PotholeSelect;

/** A report with reporter and pothole eagerly included. */
export type PotholeReportWithRelations = Prisma.PotholeReportGetPayload<{
  include: { reporter: true; pothole: { select: typeof potholeSummarySelect } };
}>;

export function toPublicUser(user: PrismaUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toPothole(pothole: PrismaPothole): Pothole {
  return {
    id: pothole.id,
    humanCode: pothole.humanCode,
    primaryPhotoKey: pothole.primaryPhotoKey,
    // Prisma Decimal -> number; the shared contract validates the coordinate ranges.
    latitude: pothole.latitude.toNumber(),
    longitude: pothole.longitude.toNumber(),
    streetName: pothole.streetName ?? null,
    status: pothole.status,
    reportCount: pothole.reportCount,
    repairsCount: pothole.repairsCount,
    firstReportedAt: pothole.firstReportedAt.toISOString(),
    lastReportedAt: pothole.lastReportedAt.toISOString(),
    lastRepairedAt: pothole.lastRepairedAt ? pothole.lastRepairedAt.toISOString() : null,
    createdAt: pothole.createdAt.toISOString(),
    updatedAt: pothole.updatedAt.toISOString(),
  };
}

export function toPotholeListItem(pothole: PrismaPothole): PotholeListItem {
  return {
    id: pothole.id,
    humanCode: pothole.humanCode,
    primaryPhotoKey: pothole.primaryPhotoKey,
    latitude: pothole.latitude.toNumber(),
    longitude: pothole.longitude.toNumber(),
    streetName: pothole.streetName ?? null,
    status: pothole.status,
    reportCount: pothole.reportCount,
    repairsCount: pothole.repairsCount,
    lastReportedAt: pothole.lastReportedAt.toISOString(),
  };
}

export function toPotholeSummary(pothole: Pick<PrismaPothole, 'id' | 'humanCode' | 'status' | 'reportCount' | 'streetName'>): PotholeSummary {
  return {
    id: pothole.id,
    humanCode: pothole.humanCode,
    status: pothole.status,
    reportCount: pothole.reportCount,
    streetName: pothole.streetName ?? null,
  };
}

export function toPotholeEventActor(byUser: PrismaUser | null): PotholeEventActor | null {
  if (!byUser) return null;
  return { id: byUser.id, name: byUser.name, avatarUrl: byUser.avatarUrl ?? null };
}

export function toPotholeEvent(event: PrismaPotholeEvent & { byUser: PrismaUser | null }): PotholeEvent {
  return {
    id: event.id,
    type: event.type,
    at: event.at.toISOString(),
    note: event.note ?? null,
    byUser: toPotholeEventActor(event.byUser),
  };
}

export function toReportHistoryItem(report: PrismaPotholeReport & { reporter: PrismaUser }): ReportHistoryItem {
  return {
    id: report.id,
    photoKey: report.photoKey,
    reporter: toPublicUser(report.reporter),
    description: report.description ?? null,
    createdAt: report.createdAt.toISOString(),
  };
}

export function toPotholeReport(report: PotholeReportWithRelations): ReportWithPothole {
  return {
    id: report.id,
    reporterId: report.reporterId,
    potholeId: report.potholeId,
    reporter: toPublicUser(report.reporter),
    pothole: toPotholeSummary(report.pothole),
    photoKey: report.photoKey,
    latitude: report.latitude.toNumber(),
    longitude: report.longitude.toNumber(),
    description: report.description ?? null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

/** Relations needed to render a repair (evidence + verdict counts, not voter rows). */
export const repairInclude = {
  assignedBy: true,
  repairer: true,
  verifications: { select: { userId: true, verdict: true } },
} satisfies Prisma.RepairInclude;

export type RepairWithRelations = Prisma.RepairGetPayload<{ include: typeof repairInclude }>;

function toEvidence(
  photoKey: string | null,
  lat: Prisma.Decimal | null,
  lng: Prisma.Decimal | null,
  at: Date | null,
): RepairEvidence | null {
  if (!photoKey || lat === null || lng === null || !at) return null;
  return { photoKey, latitude: lat.toNumber(), longitude: lng.toNumber(), at: at.toISOString() };
}

export function toRepair(repair: RepairWithRelations, viewerId?: string): Repair {
  const votes = repair.verifications;
  const fixed = votes.filter((vote) => vote.verdict === 'FIXED').length;
  const mine = viewerId ? (votes.find((vote) => vote.userId === viewerId)?.verdict ?? null) : null;

  return {
    id: repair.id,
    potholeId: repair.potholeId,
    status: repair.status,
    assignedBy: toPublicUser(repair.assignedBy),
    repairer: repair.repairer ? toPublicUser(repair.repairer) : null,
    note: repair.note ?? null,
    before: toEvidence(repair.beforePhoto, repair.beforeLat, repair.beforeLng, repair.beforeAt),
    after: toEvidence(repair.afterPhoto, repair.afterLat, repair.afterLng, repair.afterAt),
    verifications: {
      total: votes.length,
      fixed,
      notFixed: votes.length - fixed,
      myVerdict: mine,
    },
    createdAt: repair.createdAt.toISOString(),
    updatedAt: repair.updatedAt.toISOString(),
  };
}
