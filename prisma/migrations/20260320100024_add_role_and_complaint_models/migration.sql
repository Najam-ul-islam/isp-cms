-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('open', 'in_progress', 'resolved');

-- Add role column to admins with default
ALTER TABLE "admins" ADD COLUMN "role" "Role" DEFAULT 'EMPLOYEE';

-- Add updatedAt column to admins with default
ALTER TABLE "admins" ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT NOW();

-- Update existing admin records to have role
UPDATE "admins" SET "role" = 'EMPLOYEE' WHERE "role" IS NULL;

-- Update existing admin records to have updatedAt
UPDATE "admins" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

-- Now alter the columns to make them required
ALTER TABLE "admins" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "admins" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Add createdBy column to clients as nullable first
ALTER TABLE "clients" ADD COLUMN "createdBy" TEXT;

-- Update existing client records to assign to the first admin (assuming there's at least one)
DO $$
DECLARE
    first_admin_id TEXT;
BEGIN
    SELECT "id" INTO first_admin_id FROM "admins" LIMIT 1;
    IF first_admin_id IS NOT NULL THEN
        UPDATE "clients" SET "createdBy" = first_admin_id WHERE "createdBy" IS NULL;
    END IF;
END $$;

-- Now alter the column to make it required
ALTER TABLE "clients" ALTER COLUMN "createdBy" SET NOT NULL;

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;