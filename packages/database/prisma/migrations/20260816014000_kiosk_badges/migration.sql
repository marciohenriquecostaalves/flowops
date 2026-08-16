-- CreateEnum
CREATE TYPE "ProductionPunchType" AS ENUM ('START', 'PAUSE', 'RESUME', 'FINISH');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "badgeCode" TEXT;

-- CreateTable
CREATE TABLE "KioskDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KioskDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPunch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kioskDeviceId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "ProductionPunchType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionPunch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KioskDevice_tenantId_active_idx" ON "KioskDevice"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "KioskDevice_tenantId_code_key" ON "KioskDevice"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ProductionPunch_tenantId_employeeId_recordedAt_idx" ON "ProductionPunch"("tenantId", "employeeId", "recordedAt");

-- CreateIndex
CREATE INDEX "ProductionPunch_tenantId_kioskDeviceId_recordedAt_idx" ON "ProductionPunch"("tenantId", "kioskDeviceId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionPunch_sessionId_sequence_key" ON "ProductionPunch"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_badgeCode_key" ON "Employee"("tenantId", "badgeCode");

-- AddForeignKey
ALTER TABLE "KioskDevice" ADD CONSTRAINT "KioskDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KioskDevice" ADD CONSTRAINT "KioskDevice_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPunch" ADD CONSTRAINT "ProductionPunch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPunch" ADD CONSTRAINT "ProductionPunch_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPunch" ADD CONSTRAINT "ProductionPunch_kioskDeviceId_fkey" FOREIGN KEY ("kioskDeviceId") REFERENCES "KioskDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPunch" ADD CONSTRAINT "ProductionPunch_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPunch" ADD CONSTRAINT "ProductionPunch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
