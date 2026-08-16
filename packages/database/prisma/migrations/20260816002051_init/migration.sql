-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];
