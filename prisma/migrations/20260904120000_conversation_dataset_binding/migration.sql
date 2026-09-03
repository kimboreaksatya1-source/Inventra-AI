-- Conversation ↔ inventory dataset binding.
-- All added columns are NULLable with no default and no backfill, so this is a
-- metadata-only change on Postgres: fast `ADD COLUMN`, no table rewrite, no lock
-- beyond a brief ACCESS EXCLUSIVE for the catalog update.

-- AlterTable
ALTER TABLE "ChatSession"
  ADD COLUMN "datasetId" TEXT,
  ADD COLUMN "datasetName" TEXT,
  ADD COLUMN "datasetUploadedAt" TIMESTAMP(3),
  ADD COLUMN "datasetProductCount" INTEGER;

-- CreateIndex
CREATE INDEX "ChatSession_userId_datasetId_idx" ON "ChatSession"("userId", "datasetId");

-- AddForeignKey
ALTER TABLE "ChatSession"
  ADD CONSTRAINT "ChatSession_datasetId_fkey"
  FOREIGN KEY ("datasetId") REFERENCES "ImportBatch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional one-time backfill (safe to run later, or skip entirely — NULL is
-- handled everywhere as "belongs to the current dataset / legacy"):
--
--   UPDATE "ChatSession" cs
--   SET "datasetId" = ib.id,
--       "datasetName" = ib."fileName",
--       "datasetUploadedAt" = ib."createdAt"
--   FROM (
--     SELECT DISTINCT ON ("userId") id, "userId", "fileName", "createdAt"
--     FROM "ImportBatch" ORDER BY "userId", "createdAt" DESC
--   ) ib
--   WHERE cs."userId" = ib."userId" AND cs."datasetId" IS NULL;
