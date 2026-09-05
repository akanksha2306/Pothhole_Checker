-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'AWAITING_VERIFICATION', 'VERIFIED_FIXED', 'REOPENED');

-- CreateEnum
CREATE TYPE "RepairVerdict" AS ENUM ('FIXED', 'NOT_FIXED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PotholeEventType" ADD VALUE 'REPAIR_ASSIGNED';
ALTER TYPE "PotholeEventType" ADD VALUE 'REPAIR_SUBMITTED';
ALTER TYPE "PotholeEventType" ADD VALUE 'REPAIR_VERIFIED';
ALTER TYPE "PotholeEventType" ADD VALUE 'REOPENED';

-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE 'AWAITING_VERIFICATION';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'REPAIRER';

-- CreateTable
CREATE TABLE "Repair" (
    "id" TEXT NOT NULL,
    "potholeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "repairerId" TEXT,
    "status" "RepairStatus" NOT NULL DEFAULT 'ASSIGNED',
    "beforePhoto" TEXT,
    "beforeLat" DECIMAL(9,6),
    "beforeLng" DECIMAL(9,6),
    "beforeAt" TIMESTAMP(3),
    "afterPhoto" TEXT,
    "afterLat" DECIMAL(9,6),
    "afterLng" DECIMAL(9,6),
    "afterAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairVerification" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verdict" "RepairVerdict" NOT NULL,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Repair_potholeId_idx" ON "Repair"("potholeId");

-- CreateIndex
CREATE INDEX "Repair_status_idx" ON "Repair"("status");

-- CreateIndex
CREATE INDEX "Repair_repairerId_idx" ON "Repair"("repairerId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairVerification_repairId_userId_key" ON "RepairVerification"("repairId", "userId");

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_potholeId_fkey" FOREIGN KEY ("potholeId") REFERENCES "Pothole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_repairerId_fkey" FOREIGN KEY ("repairerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairVerification" ADD CONSTRAINT "RepairVerification_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "Repair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairVerification" ADD CONSTRAINT "RepairVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

