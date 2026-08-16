-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "corporateEmail" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "emailDomain" TEXT,
ADD COLUMN     "usesOwnEmailDomain" BOOLEAN NOT NULL DEFAULT false;
