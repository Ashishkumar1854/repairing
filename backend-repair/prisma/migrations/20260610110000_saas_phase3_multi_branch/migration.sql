DO $$
BEGIN
  CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "branches" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "is_main_branch" BOOLEAN NOT NULL DEFAULT false,
  "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "branches_business_id_code_key" ON "branches"("business_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "branches_one_main_per_business_idx" ON "branches"("business_id") WHERE "is_main_branch" = true;
CREATE INDEX IF NOT EXISTS "branches_business_id_status_idx" ON "branches"("business_id", "status");
CREATE INDEX IF NOT EXISTS "branches_business_id_is_main_branch_idx" ON "branches"("business_id", "is_main_branch");

DO $$
BEGIN
  ALTER TABLE "branches"
  ADD CONSTRAINT "branches_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "branches" ("id", "business_id", "name", "code", "is_main_branch", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", COALESCE("name", 'Main Branch'), 'MAIN', true, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "businesses" b
WHERE NOT EXISTS (
  SELECT 1 FROM "branches" br WHERE br."business_id" = b."id"
);

ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_assignments" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_ticket_assignments" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_technician_activity_logs" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_estimates" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_parts_usage" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "inventory_stock_movements" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_invoices" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_payments" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "customer_financial_ledger" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_financial_audit_logs" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "repair_ticket_handovers" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "vendor_repair_jobs" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "vendor_repair_status_logs" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "vendor_repair_cost_logs" ADD COLUMN IF NOT EXISTS "branch_id" UUID;

UPDATE "staff_members" s
SET "branch_id" = br."id"
FROM "branches" br
WHERE s."branch_id" IS NULL
  AND s."business_id" = br."business_id"
  AND br."is_main_branch" = true
  AND s."role" IN ('ADMIN', 'TECHNICIAN');

UPDATE "customers" t SET "branch_id" = br."id"
FROM "branches" br WHERE t."branch_id" IS NULL AND t."business_id" = br."business_id" AND br."is_main_branch" = true;
UPDATE "repair_tickets" t SET "branch_id" = br."id"
FROM "branches" br WHERE t."branch_id" IS NULL AND t."business_id" = br."business_id" AND br."is_main_branch" = true;
UPDATE "repair_assignments" t SET "branch_id" = rt."branch_id"
FROM "repair_tickets" rt WHERE t."branch_id" IS NULL AND t."repair_ticket_id" = rt."id";
UPDATE "repair_ticket_assignments" t SET "branch_id" = rt."branch_id"
FROM "repair_tickets" rt WHERE t."branch_id" IS NULL AND t."repair_ticket_id" = rt."id";
UPDATE "repair_technician_activity_logs" t SET "branch_id" = rt."branch_id"
FROM "repair_tickets" rt WHERE t."branch_id" IS NULL AND t."repair_ticket_id" = rt."id";
UPDATE "repair_estimates" t SET "branch_id" = rt."branch_id"
FROM "repair_tickets" rt WHERE t."branch_id" IS NULL AND t."repair_ticket_id" = rt."id";
UPDATE "repair_parts_usage" t SET "branch_id" = rt."branch_id"
FROM "repair_tickets" rt WHERE t."branch_id" IS NULL AND t."repair_ticket_id" = rt."id";
UPDATE "inventory_items" t SET "branch_id" = br."id"
FROM "branches" br WHERE t."branch_id" IS NULL AND t."business_id" = br."business_id" AND br."is_main_branch" = true;
UPDATE "inventory_stock_movements" t SET "branch_id" = COALESCE(
  (SELECT rt."branch_id" FROM "repair_tickets" rt WHERE rt."id" = t."repair_ticket_id"),
  (SELECT ii."branch_id" FROM "inventory_items" ii WHERE ii."id" = t."inventory_item_id"),
  br."id"
)
FROM "branches" br
WHERE t."branch_id" IS NULL AND t."business_id" = br."business_id" AND br."is_main_branch" = true;
UPDATE "repair_invoices" t SET "branch_id" = rt."branch_id"
FROM "repair_tickets" rt WHERE t."branch_id" IS NULL AND t."repair_ticket_id" = rt."id";
UPDATE "repair_payments" t SET "branch_id" = COALESCE(
  (SELECT ri."branch_id" FROM "repair_invoices" ri WHERE ri."id" = t."repair_invoice_id"),
  (SELECT rt."branch_id" FROM "repair_tickets" rt WHERE rt."id" = t."repair_ticket_id")
)
WHERE t."branch_id" IS NULL;
UPDATE "customer_financial_ledger" t SET "branch_id" = COALESCE(
  (SELECT ri."branch_id" FROM "repair_invoices" ri WHERE ri."id" = t."repair_invoice_id"),
  (SELECT rp."branch_id" FROM "repair_payments" rp WHERE rp."id" = t."repair_payment_id"),
  br."id"
)
FROM "branches" br
WHERE t."branch_id" IS NULL AND t."business_id" = br."business_id" AND br."is_main_branch" = true;
UPDATE "repair_financial_audit_logs" t SET "branch_id" = COALESCE(
  (SELECT ri."branch_id" FROM "repair_invoices" ri WHERE ri."id" = t."repair_invoice_id"),
  (SELECT rp."branch_id" FROM "repair_payments" rp WHERE rp."id" = t."repair_payment_id"),
  br."id"
)
FROM "branches" br
WHERE t."branch_id" IS NULL AND t."business_id" = br."business_id" AND br."is_main_branch" = true;
UPDATE "repair_ticket_handovers" t SET "branch_id" = rt."branch_id"
FROM "repair_tickets" rt WHERE t."branch_id" IS NULL AND t."repair_ticket_id" = rt."id";
UPDATE "vendor_repair_jobs" t SET "branch_id" = rt."branch_id"
FROM "repair_tickets" rt WHERE t."branch_id" IS NULL AND t."repair_ticket_id" = rt."id";
UPDATE "vendor_repair_status_logs" t SET "branch_id" = vj."branch_id"
FROM "vendor_repair_jobs" vj WHERE t."branch_id" IS NULL AND t."vendor_repair_job_id" = vj."id";
UPDATE "vendor_repair_cost_logs" t SET "branch_id" = vj."branch_id"
FROM "vendor_repair_jobs" vj WHERE t."branch_id" IS NULL AND t."vendor_repair_job_id" = vj."id";

ALTER TABLE "customers" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_tickets" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_assignments" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_ticket_assignments" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_technician_activity_logs" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_estimates" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_parts_usage" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "inventory_stock_movements" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_invoices" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_payments" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "customer_financial_ledger" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_financial_audit_logs" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "repair_ticket_handovers" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "vendor_repair_jobs" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "vendor_repair_status_logs" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "vendor_repair_cost_logs" ALTER COLUMN "branch_id" SET NOT NULL;

DROP INDEX IF EXISTS "customers_business_id_phone_key";
DROP INDEX IF EXISTS "customers_business_id_deleted_at_idx";
DROP INDEX IF EXISTS "inventory_items_business_id_sku_key";
DROP INDEX IF EXISTS "inventory_items_business_id_is_active_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "customers_business_id_branch_id_phone_key" ON "customers"("business_id", "branch_id", "phone");
CREATE INDEX IF NOT EXISTS "customers_business_id_branch_id_deleted_at_idx" ON "customers"("business_id", "branch_id", "deleted_at");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_business_id_branch_id_sku_key" ON "inventory_items"("business_id", "branch_id", "sku");
CREATE INDEX IF NOT EXISTS "inventory_items_business_id_branch_id_is_active_idx" ON "inventory_items"("business_id", "branch_id", "is_active");

CREATE INDEX IF NOT EXISTS "staff_members_business_id_branch_id_idx" ON "staff_members"("business_id", "branch_id");
CREATE INDEX IF NOT EXISTS "repair_tickets_business_id_branch_id_status_idx" ON "repair_tickets"("business_id", "branch_id", "status");
CREATE INDEX IF NOT EXISTS "repair_assignments_business_id_branch_id_assigned_to_staff_id_idx" ON "repair_assignments"("business_id", "branch_id", "assigned_to_staff_id");
CREATE INDEX IF NOT EXISTS "repair_estimates_business_id_branch_id_status_idx" ON "repair_estimates"("business_id", "branch_id", "status");
CREATE INDEX IF NOT EXISTS "repair_parts_usage_business_id_branch_id_used_at_idx" ON "repair_parts_usage"("business_id", "branch_id", "used_at");
CREATE INDEX IF NOT EXISTS "inventory_stock_movements_business_id_branch_id_created_at_idx" ON "inventory_stock_movements"("business_id", "branch_id", "created_at");
CREATE INDEX IF NOT EXISTS "repair_invoices_business_id_branch_id_status_idx" ON "repair_invoices"("business_id", "branch_id", "status");
CREATE INDEX IF NOT EXISTS "repair_ticket_handovers_business_id_branch_id_handed_over_at_idx" ON "repair_ticket_handovers"("business_id", "branch_id", "handed_over_at");
CREATE INDEX IF NOT EXISTS "vendor_repair_jobs_business_id_branch_id_status_idx" ON "vendor_repair_jobs"("business_id", "branch_id", "status");

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'staff_members',
    'customers',
    'repair_tickets',
    'repair_assignments',
    'repair_ticket_assignments',
    'repair_technician_activity_logs',
    'repair_estimates',
    'repair_parts_usage',
    'inventory_items',
    'inventory_stock_movements',
    'repair_invoices',
    'repair_payments',
    'customer_financial_ledger',
    'repair_financial_audit_logs',
    'repair_ticket_handovers',
    'vendor_repair_jobs',
    'vendor_repair_status_logs',
    'vendor_repair_cost_logs'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      table_name,
      table_name || '_branch_id_fkey'
    );
  END LOOP;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
