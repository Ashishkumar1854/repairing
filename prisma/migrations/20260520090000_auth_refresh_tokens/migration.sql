-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';

-- AlterTable
ALTER TABLE "staff_members"
ADD COLUMN "refresh_token_hash" TEXT,
ADD COLUMN "refresh_token_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "staff_members_business_id_refresh_token_expires_at_idx"
ON "staff_members"("business_id", "refresh_token_expires_at");
