-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnteredBy" AS ENUM ('YATRI', 'STAFF');

-- CreateTable
CREATE TABLE "Entry" (
    "id" UUID NOT NULL,
    "tokenNo" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "mobile" VARCHAR(10) NOT NULL,
    "city" TEXT NOT NULL,
    "men" INTEGER NOT NULL,
    "women" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "totalPeople" INTEGER NOT NULL,
    "wantsNashta" BOOLEAN NOT NULL,
    "wantsBhojan" BOOLEAN NOT NULL,
    "wantsStay" BOOLEAN NOT NULL,
    "mealDate" DATE,
    "mealPeople" INTEGER,
    "checkInDate" DATE,
    "checkOutDate" DATE,
    "idType" TEXT,
    "idNumberMasked" TEXT,
    "vehicleType" TEXT,
    "vehicleNumber" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "enteredBy" "EnteredBy" NOT NULL DEFAULT 'YATRI',

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entry_tokenNo_key" ON "Entry"("tokenNo");

-- CreateIndex
CREATE INDEX "Entry_createdAt_idx" ON "Entry"("createdAt");

-- CreateIndex
CREATE INDEX "Entry_mobile_idx" ON "Entry"("mobile");
