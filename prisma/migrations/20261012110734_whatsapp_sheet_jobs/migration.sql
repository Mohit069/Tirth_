-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('WHATSAPP_YATRI', 'WHATSAPP_TEAM', 'SHEET_ADD', 'SHEET_CANCEL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "lang" VARCHAR(2) NOT NULL DEFAULT 'hi';

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "entryId" UUID NOT NULL,
    "kind" "JobKind" NOT NULL,
    "target" VARCHAR(20) NOT NULL DEFAULT '',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextTryAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(3),
    "doneAt" TIMESTAMPTZ(3),
    "ref" VARCHAR(200),
    "lastError" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_status_nextTryAt_idx" ON "Job"("status", "nextTryAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_entryId_kind_target_key" ON "Job"("entryId", "kind", "target");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
