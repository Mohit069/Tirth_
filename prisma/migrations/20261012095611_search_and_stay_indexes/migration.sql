-- Trigram search (fast "contains" search on name and mobile)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "Entry_checkOutDate_idx" ON "Entry"("checkOutDate");

-- CreateIndex
CREATE INDEX "Entry_name_trgm_idx" ON "Entry" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Entry_mobile_trgm_idx" ON "Entry" USING GIN ("mobile" gin_trgm_ops);
