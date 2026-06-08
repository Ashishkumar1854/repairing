ALTER TABLE "repair_estimates"
ADD COLUMN "approved_by_id" UUID,
ADD COLUMN "rejected_by_id" UUID,
ADD COLUMN "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "repair_estimates"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "repair_estimates"
SET "subtotal_amount" = "labor_amount" + "parts_amount"
WHERE "subtotal_amount" = 0;

ALTER TABLE "repair_estimate_items"
ADD COLUMN "sku" TEXT,
ADD COLUMN "inventory_ref" TEXT;

CREATE TABLE "repair_diagnoses" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "diagnosed_by_staff_id" UUID,
    "diagnosis" TEXT NOT NULL,
    "estimated_repair_notes" TEXT,
    "estimated_turnaround_hours" INTEGER,
    "internal_notes" TEXT,
    "metadata" JSONB,
    "diagnosed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_diagnoses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_estimate_audit_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_estimate_id" UUID NOT NULL,
    "actor_staff_id" UUID,
    "action" TEXT NOT NULL,
    "previous_status" "EstimateStatus",
    "next_status" "EstimateStatus",
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_estimate_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repair_diagnoses_business_id_repair_ticket_id_diagnosed_at_idx"
ON "repair_diagnoses"("business_id", "repair_ticket_id", "diagnosed_at");

CREATE INDEX "repair_diagnoses_business_id_diagnosed_by_staff_id_idx"
ON "repair_diagnoses"("business_id", "diagnosed_by_staff_id");

CREATE INDEX "repair_estimates_business_id_approved_at_idx"
ON "repair_estimates"("business_id", "approved_at");

CREATE INDEX "repair_estimate_items_business_id_sku_idx"
ON "repair_estimate_items"("business_id", "sku");

CREATE INDEX "repair_estimate_audit_logs_business_id_repair_estimate_id_created_at_idx"
ON "repair_estimate_audit_logs"("business_id", "repair_estimate_id", "created_at");

CREATE INDEX "repair_estimate_audit_logs_business_id_action_idx"
ON "repair_estimate_audit_logs"("business_id", "action");

ALTER TABLE "repair_estimates"
ADD CONSTRAINT "repair_estimates_approved_by_id_fkey"
FOREIGN KEY ("approved_by_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_estimates"
ADD CONSTRAINT "repair_estimates_rejected_by_id_fkey"
FOREIGN KEY ("rejected_by_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_diagnoses"
ADD CONSTRAINT "repair_diagnoses_repair_ticket_id_fkey"
FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repair_diagnoses"
ADD CONSTRAINT "repair_diagnoses_diagnosed_by_staff_id_fkey"
FOREIGN KEY ("diagnosed_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_estimate_audit_logs"
ADD CONSTRAINT "repair_estimate_audit_logs_repair_estimate_id_fkey"
FOREIGN KEY ("repair_estimate_id") REFERENCES "repair_estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repair_estimate_audit_logs"
ADD CONSTRAINT "repair_estimate_audit_logs_actor_staff_id_fkey"
FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
