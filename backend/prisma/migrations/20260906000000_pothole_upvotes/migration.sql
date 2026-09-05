-- CreateTable
CREATE TABLE "PotholeUpvote" (
    "id" TEXT NOT NULL,
    "potholeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PotholeUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PotholeUpvote_userId_idx" ON "PotholeUpvote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PotholeUpvote_potholeId_userId_key" ON "PotholeUpvote"("potholeId", "userId");

-- AddForeignKey
ALTER TABLE "PotholeUpvote" ADD CONSTRAINT "PotholeUpvote_potholeId_fkey" FOREIGN KEY ("potholeId") REFERENCES "Pothole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotholeUpvote" ADD CONSTRAINT "PotholeUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

