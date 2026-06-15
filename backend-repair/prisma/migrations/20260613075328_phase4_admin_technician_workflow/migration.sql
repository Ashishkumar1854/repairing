-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'READY_FOR_REVIEW';

-- DropIndex
DROP INDEX "staff_members_business_id_refresh_token_expires_at_idx";

-- AlterTable
ALTER TABLE "repair_tickets" ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "estimated_completion_time" TIMESTAMP(3),
ADD COLUMN     "final_invoice_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "labor_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "parts_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "profit_estimate" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "repair_notes" TEXT,
ADD COLUMN     "repair_remarks" TEXT,
ADD COLUMN     "total_repair_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vendor_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "work_performed" TEXT;

-- CreateIndex
CREATE INDEX "customer_financial_ledger_business_id_branch_id_created_at_idx" ON "customer_financial_ledger"("business_id", "branch_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_items_business_id_is_active_idx" ON "inventory_items"("business_id", "is_active");

-- CreateIndex
CREATE INDEX "repair_financial_audit_logs_business_id_branch_id_created_a_idx" ON "repair_financial_audit_logs"("business_id", "branch_id", "created_at");

-- CreateIndex
CREATE INDEX "repair_payments_business_id_branch_id_collected_at_idx" ON "repair_payments"("business_id", "branch_id", "collected_at");

-- CreateIndex
CREATE INDEX "repair_technician_activity_logs_business_id_branch_id_creat_idx" ON "repair_technician_activity_logs"("business_id", "branch_id", "created_at");

-- CreateIndex
CREATE INDEX "repair_ticket_assignments_business_id_branch_id_assigned_at_idx" ON "repair_ticket_assignments"("business_id", "branch_id", "assigned_at");

-- CreateIndex
CREATE INDEX "vendor_repair_cost_logs_business_id_branch_id_created_at_idx" ON "vendor_repair_cost_logs"("business_id", "branch_id", "created_at");

-- CreateIndex
CREATE INDEX "vendor_repair_status_logs_business_id_branch_id_created_at_idx" ON "vendor_repair_status_logs"("business_id", "branch_id", "created_at");

-- RenameIndex
ALTER INDEX "customer_financial_ledger_business_id_customer_id_created_at_id" RENAME TO "customer_financial_ledger_business_id_customer_id_created_a_idx";

-- RenameIndex
ALTER INDEX "inventory_stock_movements_business_id_inventory_item_id_created" RENAME TO "inventory_stock_movements_business_id_inventory_item_id_cre_idx";

-- RenameIndex
ALTER INDEX "repair_assignments_business_id_branch_id_assigned_to_staff_id_i" RENAME TO "repair_assignments_business_id_branch_id_assigned_to_staff__idx";

-- RenameIndex
ALTER INDEX "repair_estimate_audit_logs_business_id_repair_estimate_id_creat" RENAME TO "repair_estimate_audit_logs_business_id_repair_estimate_id_c_idx";

-- RenameIndex
ALTER INDEX "repair_financial_audit_logs_business_id_repair_invoice_id_creat" RENAME TO "repair_financial_audit_logs_business_id_repair_invoice_id_c_idx";

-- RenameIndex
ALTER INDEX "repair_financial_audit_logs_business_id_repair_payment_id_creat" RENAME TO "repair_financial_audit_logs_business_id_repair_payment_id_c_idx";

-- RenameIndex
ALTER INDEX "repair_technician_activity_logs_business_id_repair_ticket_id_cr" RENAME TO "repair_technician_activity_logs_business_id_repair_ticket_i_idx";

-- RenameIndex
ALTER INDEX "repair_technician_activity_logs_business_id_technician_id_creat" RENAME TO "repair_technician_activity_logs_business_id_technician_id_c_idx";

-- RenameIndex
ALTER INDEX "repair_ticket_assignments_business_id_assigned_to_staff_id_assi" RENAME TO "repair_ticket_assignments_business_id_assigned_to_staff_id__idx";

-- RenameIndex
ALTER INDEX "repair_ticket_assignments_business_id_previous_assigned_to_staf" RENAME TO "repair_ticket_assignments_business_id_previous_assigned_to__idx";

-- RenameIndex
ALTER INDEX "repair_ticket_assignments_business_id_repair_ticket_id_assigned" RENAME TO "repair_ticket_assignments_business_id_repair_ticket_id_assi_idx";

-- RenameIndex
ALTER INDEX "repair_ticket_handovers_business_id_branch_id_handed_over_at_id" RENAME TO "repair_ticket_handovers_business_id_branch_id_handed_over_a_idx";

-- RenameIndex
ALTER INDEX "repair_ticket_handovers_business_id_repair_ticket_id_handed_ove" RENAME TO "repair_ticket_handovers_business_id_repair_ticket_id_handed_idx";

-- RenameIndex
ALTER INDEX "vendor_repair_cost_logs_business_id_vendor_repair_job_id_create" RENAME TO "vendor_repair_cost_logs_business_id_vendor_repair_job_id_cr_idx";

-- RenameIndex
ALTER INDEX "vendor_repair_status_logs_business_id_vendor_repair_job_id_crea" RENAME TO "vendor_repair_status_logs_business_id_vendor_repair_job_id__idx";
