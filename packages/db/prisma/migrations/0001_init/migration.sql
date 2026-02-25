-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'OPS', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('MAP', 'MRP', 'UNDERCUT', 'DEAD_STOCK');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MED', 'HIGH');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACK', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sku" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "map" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "onHandQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleRow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "soldPrice" DOUBLE PRECISION NOT NULL,
    "qty" INTEGER NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "orderRef" TEXT NOT NULL,
    CONSTRAINT "SaleRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "skuId" TEXT NOT NULL,
    "dealerId" TEXT,
    "competitorId" TEXT,
    "severity" "Severity" NOT NULL,
    "impactAmount" DOUBLE PRECISION NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "alertId" TEXT,
    "title" TEXT NOT NULL,
    "slaDueAt" TIMESTAMP(3),
    "assigneeUserId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "Sku_tenantId_idx" ON "Sku"("tenantId");
CREATE INDEX "Sku_tenantId_skuCode_idx" ON "Sku"("tenantId", "skuCode");
CREATE INDEX "Dealer_tenantId_idx" ON "Dealer"("tenantId");
CREATE INDEX "SaleRow_tenantId_idx" ON "SaleRow"("tenantId");
CREATE INDEX "SaleRow_tenantId_soldAt_idx" ON "SaleRow"("tenantId", "soldAt");
CREATE INDEX "SaleRow_tenantId_skuId_idx" ON "SaleRow"("tenantId", "skuId");
CREATE INDEX "Competitor_tenantId_idx" ON "Competitor"("tenantId");
CREATE INDEX "CompetitorSnapshot_tenantId_idx" ON "CompetitorSnapshot"("tenantId");
CREATE INDEX "CompetitorSnapshot_tenantId_capturedAt_idx" ON "CompetitorSnapshot"("tenantId", "capturedAt");
CREATE INDEX "CompetitorSnapshot_tenantId_skuId_idx" ON "CompetitorSnapshot"("tenantId", "skuId");
CREATE INDEX "Alert_tenantId_idx" ON "Alert"("tenantId");
CREATE INDEX "Alert_tenantId_createdAt_idx" ON "Alert"("tenantId", "createdAt");
CREATE UNIQUE INDEX "Alert_tenantId_dedupeKey_key" ON "Alert"("tenantId", "dedupeKey");
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleRow" ADD CONSTRAINT "SaleRow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
