-- CreateTable
CREATE TABLE "AiAccount" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL DEFAULT '{}',
    "balance" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AiPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "setup" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT NOT NULL DEFAULT '',
    "deployment" TEXT NOT NULL DEFAULT '{}',
    "operationAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AiRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "AiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "reserved" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'running',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AiPage_shop_updatedAt_idx" ON "AiPage"("shop", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiRevision_pageId_version_key" ON "AiRevision"("pageId", "version");

-- CreateIndex
CREATE INDEX "AiGeneration_shop_status_createdAt_idx" ON "AiGeneration"("shop", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiGeneration_shop_requestKey_key" ON "AiGeneration"("shop", "requestKey");

