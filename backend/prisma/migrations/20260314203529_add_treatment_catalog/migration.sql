-- CreateTable
CREATE TABLE "TreatmentCatalog" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TreatmentCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreatmentCatalog_deletedAt_idx" ON "TreatmentCatalog"("deletedAt");
