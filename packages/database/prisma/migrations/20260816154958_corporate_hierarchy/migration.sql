-- CreateEnum
CREATE TYPE "BusinessUnitType" AS ENUM ('HEADQUARTERS', 'BRANCH');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "ActivitySession" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "JobTitle" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "KioskDevice" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "ProductionPunch" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "unitId" TEXT;

-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BusinessUnitType" NOT NULL DEFAULT 'BRANCH',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUnitAccess" (
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserUnitAccess_pkey" PRIMARY KEY ("userId","unitId")
);

-- Preserve existing data by creating one default headquarters per tenant.
INSERT INTO "BusinessUnit" ("id", "tenantId", "code", "name", "type", "active", "createdAt", "updatedAt")
SELECT md5(t."id" || ':headquarters'), t."id", 'MATRIZ', t."name", 'HEADQUARTERS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t;

-- Associate all existing operational records with their tenant headquarters.
UPDATE "Employee" e SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = e."tenantId" AND u."code" = 'MATRIZ';
UPDATE "JobTitle" j SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = j."tenantId" AND u."code" = 'MATRIZ';
UPDATE "Department" d SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = d."tenantId" AND u."code" = 'MATRIZ';
UPDATE "Shift" s SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = s."tenantId" AND u."code" = 'MATRIZ';
UPDATE "Activity" a SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = a."tenantId" AND u."code" = 'MATRIZ';
UPDATE "ActivitySession" s SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = s."tenantId" AND u."code" = 'MATRIZ';
UPDATE "KioskDevice" k SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = k."tenantId" AND u."code" = 'MATRIZ';
UPDATE "ProductionPunch" p SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = p."tenantId" AND u."code" = 'MATRIZ';
UPDATE "AuditLog" l SET "unitId" = u."id" FROM "BusinessUnit" u WHERE u."tenantId" = l."tenantId" AND u."code" = 'MATRIZ';

-- Give every existing user access to the default headquarters.
INSERT INTO "UserUnitAccess" ("userId", "unitId", "isPrimary")
SELECT usr."id", u."id", true
FROM "User" usr
JOIN "BusinessUnit" u ON u."tenantId" = usr."tenantId" AND u."code" = 'MATRIZ';

-- CreateIndex
CREATE INDEX "BusinessUnit_tenantId_parentId_idx" ON "BusinessUnit"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "BusinessUnit_tenantId_active_idx" ON "BusinessUnit"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnit_tenantId_code_key" ON "BusinessUnit"("tenantId", "code");

-- CreateIndex
CREATE INDEX "UserUnitAccess_unitId_idx" ON "UserUnitAccess"("unitId");

CREATE INDEX "Employee_unitId_status_idx" ON "Employee"("unitId", "status");
CREATE INDEX "JobTitle_unitId_active_idx" ON "JobTitle"("unitId", "active");
CREATE INDEX "Department_unitId_idx" ON "Department"("unitId");
CREATE INDEX "Shift_unitId_active_idx" ON "Shift"("unitId", "active");
CREATE INDEX "Activity_unitId_status_idx" ON "Activity"("unitId", "status");
CREATE INDEX "ActivitySession_unitId_startedAt_idx" ON "ActivitySession"("unitId", "startedAt");
CREATE INDEX "KioskDevice_unitId_active_idx" ON "KioskDevice"("unitId", "active");
CREATE INDEX "ProductionPunch_unitId_recordedAt_idx" ON "ProductionPunch"("unitId", "recordedAt");
CREATE INDEX "AuditLog_unitId_createdAt_idx" ON "AuditLog"("unitId", "createdAt");

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnitAccess" ADD CONSTRAINT "UserUnitAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnitAccess" ADD CONSTRAINT "UserUnitAccess_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTitle" ADD CONSTRAINT "JobTitle_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KioskDevice" ADD CONSTRAINT "KioskDevice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPunch" ADD CONSTRAINT "ProductionPunch_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
