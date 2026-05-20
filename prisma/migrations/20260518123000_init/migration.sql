-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('REPAIR_SHOP', 'SERVICE_CENTER', 'REFURBISHER', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('RECEIVED', 'DIAGNOSING', 'ESTIMATE_PENDING', 'WAITING_APPROVAL', 'APPROVED', 'IN_REPAIR', 'WAITING_PARTS', 'SENT_TO_VENDOR', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'FRONT_DESK');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('CUSTOMER_TO_BUSINESS', 'STAFF_TO_STAFF', 'BUSINESS_TO_VENDOR', 'VENDOR_TO_BUSINESS', 'BUSINESS_TO_CUSTOMER');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "BusinessType" NOT NULL DEFAULT 'REPAIR_SHOP',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'TECHNICIAN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_tickets" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "vendor_id" UUID,
    "ticket_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_ticket_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "imei" TEXT,
    "condition" TEXT,
    "accessories" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_ticket_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_ticket_issues" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_ticket_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_status_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "actor_staff_id" UUID,
    "from_status" "TicketStatus",
    "to_status" "TicketStatus" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_assignments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "assigned_to_staff_id" UUID NOT NULL,
    "assigned_by_staff_id" UUID,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_estimates" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "created_by_id" UUID,
    "estimate_number" TEXT NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "labor_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "parts_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valid_until" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_estimate_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_estimate_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_parts_usage" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "technician_id" UUID,
    "part_name" TEXT NOT NULL,
    "part_sku" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2),
    "total_cost" DECIMAL(12,2),
    "source" TEXT,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_parts_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_payments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "collected_by_staff_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_media" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "uploaded_by_id" UUID,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_notes" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "created_by_id" UUID,
    "note" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_handover_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "vendor_id" UUID,
    "from_staff_id" UUID,
    "to_staff_id" UUID,
    "type" "HandoverType" NOT NULL,
    "notes" TEXT,
    "condition" TEXT,
    "accessories" JSONB,
    "handed_over_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_handover_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_deleted_at_idx" ON "businesses"("deleted_at");

-- CreateIndex
CREATE INDEX "customers_business_id_deleted_at_idx" ON "customers"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "customers_business_id_full_name_idx" ON "customers"("business_id", "full_name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_business_id_phone_key" ON "customers"("business_id", "phone");

-- CreateIndex
CREATE INDEX "staff_members_business_id_role_is_active_idx" ON "staff_members"("business_id", "role", "is_active");

-- CreateIndex
CREATE INDEX "staff_members_business_id_deleted_at_idx" ON "staff_members"("business_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_business_id_email_key" ON "staff_members"("business_id", "email");

-- CreateIndex
CREATE INDEX "vendors_business_id_is_active_idx" ON "vendors"("business_id", "is_active");

-- CreateIndex
CREATE INDEX "vendors_business_id_deleted_at_idx" ON "vendors"("business_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_business_id_name_key" ON "vendors"("business_id", "name");

-- CreateIndex
CREATE INDEX "repair_tickets_business_id_status_priority_idx" ON "repair_tickets"("business_id", "status", "priority");

-- CreateIndex
CREATE INDEX "repair_tickets_business_id_customer_id_idx" ON "repair_tickets"("business_id", "customer_id");

-- CreateIndex
CREATE INDEX "repair_tickets_business_id_vendor_id_idx" ON "repair_tickets"("business_id", "vendor_id");

-- CreateIndex
CREATE INDEX "repair_tickets_business_id_deleted_at_idx" ON "repair_tickets"("business_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "repair_tickets_business_id_ticket_number_key" ON "repair_tickets"("business_id", "ticket_number");

-- CreateIndex
CREATE INDEX "repair_ticket_items_business_id_repair_ticket_id_idx" ON "repair_ticket_items"("business_id", "repair_ticket_id");

-- CreateIndex
CREATE INDEX "repair_ticket_items_business_id_serial_number_idx" ON "repair_ticket_items"("business_id", "serial_number");

-- CreateIndex
CREATE INDEX "repair_ticket_items_business_id_imei_idx" ON "repair_ticket_items"("business_id", "imei");

-- CreateIndex
CREATE INDEX "repair_ticket_items_business_id_deleted_at_idx" ON "repair_ticket_items"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "repair_ticket_issues_business_id_repair_ticket_id_idx" ON "repair_ticket_issues"("business_id", "repair_ticket_id");

-- CreateIndex
CREATE INDEX "repair_ticket_issues_business_id_deleted_at_idx" ON "repair_ticket_issues"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "repair_status_logs_business_id_repair_ticket_id_created_at_idx" ON "repair_status_logs"("business_id", "repair_ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "repair_status_logs_business_id_to_status_idx" ON "repair_status_logs"("business_id", "to_status");

-- CreateIndex
CREATE INDEX "repair_assignments_business_id_repair_ticket_id_idx" ON "repair_assignments"("business_id", "repair_ticket_id");

-- CreateIndex
CREATE INDEX "repair_assignments_business_id_assigned_to_staff_id_status_idx" ON "repair_assignments"("business_id", "assigned_to_staff_id", "status");

-- CreateIndex
CREATE INDEX "repair_assignments_business_id_deleted_at_idx" ON "repair_assignments"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "repair_estimates_business_id_repair_ticket_id_idx" ON "repair_estimates"("business_id", "repair_ticket_id");

-- CreateIndex
CREATE INDEX "repair_estimates_business_id_status_idx" ON "repair_estimates"("business_id", "status");

-- CreateIndex
CREATE INDEX "repair_estimates_business_id_deleted_at_idx" ON "repair_estimates"("business_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "repair_estimates_business_id_estimate_number_key" ON "repair_estimates"("business_id", "estimate_number");

-- CreateIndex
CREATE INDEX "repair_estimate_items_business_id_repair_estimate_id_idx" ON "repair_estimate_items"("business_id", "repair_estimate_id");

-- CreateIndex
CREATE INDEX "repair_estimate_items_business_id_deleted_at_idx" ON "repair_estimate_items"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "repair_parts_usage_business_id_repair_ticket_id_idx" ON "repair_parts_usage"("business_id", "repair_ticket_id");

-- CreateIndex
CREATE INDEX "repair_parts_usage_business_id_part_sku_idx" ON "repair_parts_usage"("business_id", "part_sku");

-- CreateIndex
CREATE INDEX "repair_parts_usage_business_id_used_at_idx" ON "repair_parts_usage"("business_id", "used_at");

-- CreateIndex
CREATE INDEX "repair_parts_usage_business_id_deleted_at_idx" ON "repair_parts_usage"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "repair_payments_business_id_repair_ticket_id_idx" ON "repair_payments"("business_id", "repair_ticket_id");

-- CreateIndex
CREATE INDEX "repair_payments_business_id_status_idx" ON "repair_payments"("business_id", "status");

-- CreateIndex
CREATE INDEX "repair_payments_business_id_paid_at_idx" ON "repair_payments"("business_id", "paid_at");

-- CreateIndex
CREATE INDEX "repair_payments_business_id_deleted_at_idx" ON "repair_payments"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "repair_media_business_id_repair_ticket_id_idx" ON "repair_media"("business_id", "repair_ticket_id");

-- CreateIndex
CREATE INDEX "repair_media_business_id_type_idx" ON "repair_media"("business_id", "type");

-- CreateIndex
CREATE INDEX "repair_media_business_id_deleted_at_idx" ON "repair_media"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "repair_notes_business_id_repair_ticket_id_idx" ON "repair_notes"("business_id", "repair_ticket_id");

-- CreateIndex
CREATE INDEX "repair_notes_business_id_is_internal_idx" ON "repair_notes"("business_id", "is_internal");

-- CreateIndex
CREATE INDEX "repair_notes_business_id_deleted_at_idx" ON "repair_notes"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "repair_handover_logs_business_id_repair_ticket_id_handed_ov_idx" ON "repair_handover_logs"("business_id", "repair_ticket_id", "handed_over_at");

-- CreateIndex
CREATE INDEX "repair_handover_logs_business_id_vendor_id_idx" ON "repair_handover_logs"("business_id", "vendor_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_ticket_items" ADD CONSTRAINT "repair_ticket_items_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_ticket_issues" ADD CONSTRAINT "repair_ticket_issues_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_status_logs" ADD CONSTRAINT "repair_status_logs_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_status_logs" ADD CONSTRAINT "repair_status_logs_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_assignments" ADD CONSTRAINT "repair_assignments_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_assignments" ADD CONSTRAINT "repair_assignments_assigned_to_staff_id_fkey" FOREIGN KEY ("assigned_to_staff_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_assignments" ADD CONSTRAINT "repair_assignments_assigned_by_staff_id_fkey" FOREIGN KEY ("assigned_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_estimates" ADD CONSTRAINT "repair_estimates_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_estimates" ADD CONSTRAINT "repair_estimates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_estimate_items" ADD CONSTRAINT "repair_estimate_items_repair_estimate_id_fkey" FOREIGN KEY ("repair_estimate_id") REFERENCES "repair_estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_parts_usage" ADD CONSTRAINT "repair_parts_usage_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_parts_usage" ADD CONSTRAINT "repair_parts_usage_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_payments" ADD CONSTRAINT "repair_payments_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_payments" ADD CONSTRAINT "repair_payments_collected_by_staff_id_fkey" FOREIGN KEY ("collected_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_media" ADD CONSTRAINT "repair_media_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_media" ADD CONSTRAINT "repair_media_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_notes" ADD CONSTRAINT "repair_notes_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_notes" ADD CONSTRAINT "repair_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_handover_logs" ADD CONSTRAINT "repair_handover_logs_repair_ticket_id_fkey" FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_handover_logs" ADD CONSTRAINT "repair_handover_logs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_handover_logs" ADD CONSTRAINT "repair_handover_logs_from_staff_id_fkey" FOREIGN KEY ("from_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_handover_logs" ADD CONSTRAINT "repair_handover_logs_to_staff_id_fkey" FOREIGN KEY ("to_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
