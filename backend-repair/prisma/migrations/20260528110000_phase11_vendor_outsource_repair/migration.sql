CREATE TYPE "VendorRepairJobStatus" AS ENUM (
  'CREATED',
  'DISPATCHED',
  'IN_PROGRESS',
  'WAITING_VENDOR_QUOTE',
  'COMPLETED',
  'RETURNED',
  'CANCELLED'
);

CREATE TYPE "VendorRepairCostStatus" AS ENUM (
  'NOT_ESTIMATED',
  'ESTIMATED',
  'APPROVED',
  'INVOICED',
  'PAID',
  'CANCELLED'
);

CREATE TABLE "vendor_repair_jobs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "created_by_staff_id" UUID,
    "external_ref" TEXT,
    "status" "VendorRepairJobStatus" NOT NULL DEFAULT 'CREATED',
    "cost_status" "VendorRepairCostStatus" NOT NULL DEFAULT 'NOT_ESTIMATED',
    "issue_description" TEXT,
    "dispatch_notes" TEXT,
    "vendor_diagnosis" TEXT,
    "vendor_resolution" TEXT,
    "estimated_cost" DECIMAL(12,2),
    "approved_cost" DECIMAL(12,2),
    "final_cost" DECIMAL(12,2),
    "expected_return_at" TIMESTAMP(3),
    "dispatched_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendor_repair_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_repair_status_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "vendor_repair_job_id" UUID NOT NULL,
    "actor_staff_id" UUID,
    "previous_status" "VendorRepairJobStatus",
    "next_status" "VendorRepairJobStatus" NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_repair_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_repair_cost_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "vendor_repair_job_id" UUID NOT NULL,
    "actor_staff_id" UUID,
    "previous_estimated_cost" DECIMAL(12,2),
    "estimated_cost" DECIMAL(12,2),
    "previous_approved_cost" DECIMAL(12,2),
    "approved_cost" DECIMAL(12,2),
    "previous_final_cost" DECIMAL(12,2),
    "final_cost" DECIMAL(12,2),
    "previous_cost_status" "VendorRepairCostStatus",
    "next_cost_status" "VendorRepairCostStatus" NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_repair_cost_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vendor_repair_jobs_business_id_repair_ticket_id_idx" ON "vendor_repair_jobs"("business_id", "repair_ticket_id");
CREATE INDEX "vendor_repair_jobs_business_id_vendor_id_idx" ON "vendor_repair_jobs"("business_id", "vendor_id");
CREATE INDEX "vendor_repair_jobs_business_id_status_idx" ON "vendor_repair_jobs"("business_id", "status");
CREATE INDEX "vendor_repair_jobs_business_id_cost_status_idx" ON "vendor_repair_jobs"("business_id", "cost_status");
CREATE INDEX "vendor_repair_jobs_business_id_external_ref_idx" ON "vendor_repair_jobs"("business_id", "external_ref");
CREATE INDEX "vendor_repair_jobs_business_id_dispatched_at_idx" ON "vendor_repair_jobs"("business_id", "dispatched_at");
CREATE INDEX "vendor_repair_jobs_business_id_expected_return_at_idx" ON "vendor_repair_jobs"("business_id", "expected_return_at");
CREATE INDEX "vendor_repair_jobs_business_id_deleted_at_idx" ON "vendor_repair_jobs"("business_id", "deleted_at");

CREATE INDEX "vendor_repair_status_logs_business_id_vendor_repair_job_id_created_at_idx" ON "vendor_repair_status_logs"("business_id", "vendor_repair_job_id", "created_at");
CREATE INDEX "vendor_repair_status_logs_business_id_next_status_idx" ON "vendor_repair_status_logs"("business_id", "next_status");
CREATE INDEX "vendor_repair_status_logs_business_id_actor_staff_id_idx" ON "vendor_repair_status_logs"("business_id", "actor_staff_id");

CREATE INDEX "vendor_repair_cost_logs_business_id_vendor_repair_job_id_created_at_idx" ON "vendor_repair_cost_logs"("business_id", "vendor_repair_job_id", "created_at");
CREATE INDEX "vendor_repair_cost_logs_business_id_next_cost_status_idx" ON "vendor_repair_cost_logs"("business_id", "next_cost_status");
CREATE INDEX "vendor_repair_cost_logs_business_id_actor_staff_id_idx" ON "vendor_repair_cost_logs"("business_id", "actor_staff_id");

ALTER TABLE "vendor_repair_jobs"
ADD CONSTRAINT "vendor_repair_jobs_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_jobs"
ADD CONSTRAINT "vendor_repair_jobs_repair_ticket_id_fkey"
FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_jobs"
ADD CONSTRAINT "vendor_repair_jobs_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_jobs"
ADD CONSTRAINT "vendor_repair_jobs_created_by_staff_id_fkey"
FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_status_logs"
ADD CONSTRAINT "vendor_repair_status_logs_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_status_logs"
ADD CONSTRAINT "vendor_repair_status_logs_vendor_repair_job_id_fkey"
FOREIGN KEY ("vendor_repair_job_id") REFERENCES "vendor_repair_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_status_logs"
ADD CONSTRAINT "vendor_repair_status_logs_actor_staff_id_fkey"
FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_cost_logs"
ADD CONSTRAINT "vendor_repair_cost_logs_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_cost_logs"
ADD CONSTRAINT "vendor_repair_cost_logs_vendor_repair_job_id_fkey"
FOREIGN KEY ("vendor_repair_job_id") REFERENCES "vendor_repair_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_repair_cost_logs"
ADD CONSTRAINT "vendor_repair_cost_logs_actor_staff_id_fkey"
FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
