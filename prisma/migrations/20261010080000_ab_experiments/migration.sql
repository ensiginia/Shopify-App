-- CreateTable
CREATE TABLE "AbExperiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "setup" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "activeTargetKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "discounts" TEXT NOT NULL DEFAULT '{}',
    "rolloutVariant" TEXT,
    "selectedVariant" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "endedAt" DATETIME
);

-- CreateTable
CREATE TABLE "AbExposure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "experimentId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbExposure_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "AbExperiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AbOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "refundCents" INTEGER NOT NULL DEFAULT 0,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME NOT NULL,
    CONSTRAINT "AbOrder_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "AbExperiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AbRefund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AbAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "experimentId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AbExperiment_shop_createdAt_idx" ON "AbExperiment"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AbExperiment_shop_activeTargetKey_key" ON "AbExperiment"("shop", "activeTargetKey");

-- CreateIndex
CREATE INDEX "AbExposure_experimentId_variant_idx" ON "AbExposure"("experimentId", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "AbExposure_experimentId_visitorHash_key" ON "AbExposure"("experimentId", "visitorHash");

-- CreateIndex
CREATE INDEX "AbOrder_experimentId_variant_visitorHash_idx" ON "AbOrder"("experimentId", "variant", "visitorHash");

-- CreateIndex
CREATE UNIQUE INDEX "AbOrder_shop_orderId_key" ON "AbOrder"("shop", "orderId");

-- CreateIndex
CREATE INDEX "AbRefund_shop_orderId_idx" ON "AbRefund"("shop", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "AbRefund_shop_refundId_key" ON "AbRefund"("shop", "refundId");

-- CreateIndex
CREATE INDEX "AbAudit_shop_createdAt_idx" ON "AbAudit"("shop", "createdAt");
