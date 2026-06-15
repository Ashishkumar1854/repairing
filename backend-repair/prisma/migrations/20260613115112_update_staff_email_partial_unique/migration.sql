-- DropIndex
DROP INDEX "staff_members_business_id_email_key";

-- CreateIndex
CREATE INDEX "staff_members_business_id_email_idx" ON "staff_members"("business_id", "email");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "staff_members_active_email_idx" ON "staff_members"("business_id", "email") WHERE "deleted_at" IS NULL;
