-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "hasIdPhoto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "idPhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "IdPhoto" (
    "entryId" UUID NOT NULL,
    "mime" VARCHAR(30) NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdPhoto_pkey" PRIMARY KEY ("entryId")
);

-- AddForeignKey
ALTER TABLE "IdPhoto" ADD CONSTRAINT "IdPhoto_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
