-- PotholeReport.status moves to Pothole: every existing report becomes one
-- Pothole (with its own humanCode from pothole_human_code_seq) plus a REPORTED
-- timeline event, and is linked to it. Runs in a single statement stream, so the
-- whole migration is atomic.
--
-- Ordering matters: the backfill must run while PotholeReport."status" still
-- exists, so the column is dropped only afterwards.

-- CreateEnum
CREATE TYPE "PotholeEventType" AS ENUM ('REPORTED', 'REPAIRED', 'REPORTED_AGAIN', 'STATUS_CHANGED');

-- CreateTable
CREATE TABLE "Pothole" (
    "id" TEXT NOT NULL,
    "humanCode" TEXT NOT NULL,
    "primaryPhotoKey" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "streetName" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'REPORTED',
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "repairsCount" INTEGER NOT NULL DEFAULT 0,
    "firstReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRepairedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pothole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PotholeEvent" (
    "id" TEXT NOT NULL,
    "potholeId" TEXT NOT NULL,
    "type" "PotholeEventType" NOT NULL,
    "byUserId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "PotholeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateSequence: BLR-00001 style human codes (city prefix applied at write time).
CREATE SEQUENCE "pothole_human_code_seq";

-- AlterTable: add the FK column nullable; backfill first, NOT NULL afterwards.
ALTER TABLE "PotholeReport" ADD COLUMN "potholeId" TEXT;

-- Backfill: one Pothole per existing report. The report's own status carries over
-- (a demo row marked RESOLVED keeps that history as repairsCount + a REPAIRED
-- event instead of silently resetting to REPORTED).
DO $$
DECLARE
    r RECORD;
    v_pothole_id TEXT;
    v_was_resolved BOOLEAN;
BEGIN
    FOR r IN SELECT "id", "reporterId", "photoKey", "latitude", "longitude", "status", "createdAt", "updatedAt" FROM "PotholeReport" LOOP
        v_pothole_id := gen_random_uuid()::text;
        v_was_resolved := r."status" = 'RESOLVED';

        INSERT INTO "Pothole" (
            "id", "humanCode", "primaryPhotoKey", "latitude", "longitude", "streetName",
            "status", "reportCount", "repairsCount", "firstReportedAt", "lastReportedAt",
            "lastRepairedAt", "createdAt", "updatedAt"
        ) VALUES (
            v_pothole_id,
            'BLR-' || lpad(nextval('pothole_human_code_seq')::text, 5, '0'),
            r."photoKey",
            r."latitude",
            r."longitude",
            NULL,
            r."status",
            1,
            CASE WHEN v_was_resolved THEN 1 ELSE 0 END,
            r."createdAt",
            r."createdAt",
            CASE WHEN v_was_resolved THEN r."updatedAt" ELSE NULL END,
            r."createdAt",
            r."updatedAt"
        );

        UPDATE "PotholeReport" SET "potholeId" = v_pothole_id WHERE "id" = r."id";

        INSERT INTO "PotholeEvent" ("id", "potholeId", "type", "byUserId", "at")
        VALUES (gen_random_uuid()::text, v_pothole_id, 'REPORTED', r."reporterId", r."createdAt");

        IF v_was_resolved THEN
            INSERT INTO "PotholeEvent" ("id", "potholeId", "type", "byUserId", "at")
            VALUES (gen_random_uuid()::text, v_pothole_id, 'REPAIRED', NULL, r."updatedAt");
        END IF;
    END LOOP;
END $$;

-- AlterTable
ALTER TABLE "PotholeReport" ALTER COLUMN "potholeId" SET NOT NULL;

-- DropIndex
DROP INDEX "PotholeReport_status_idx";

-- AlterTable: status now lives on Pothole.
ALTER TABLE "PotholeReport" DROP COLUMN "status";

-- CreateIndex
CREATE UNIQUE INDEX "Pothole_humanCode_key" ON "Pothole"("humanCode");

-- CreateIndex
CREATE INDEX "Pothole_status_idx" ON "Pothole"("status");

-- CreateIndex
CREATE INDEX "Pothole_latitude_longitude_idx" ON "Pothole"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Pothole_reportCount_idx" ON "Pothole"("reportCount");

-- CreateIndex
CREATE INDEX "PotholeEvent_potholeId_at_idx" ON "PotholeEvent"("potholeId", "at");

-- CreateIndex
CREATE INDEX "PotholeReport_potholeId_idx" ON "PotholeReport"("potholeId");

-- AddForeignKey
ALTER TABLE "PotholeReport" ADD CONSTRAINT "PotholeReport_potholeId_fkey" FOREIGN KEY ("potholeId") REFERENCES "Pothole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotholeEvent" ADD CONSTRAINT "PotholeEvent_potholeId_fkey" FOREIGN KEY ("potholeId") REFERENCES "Pothole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotholeEvent" ADD CONSTRAINT "PotholeEvent_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
