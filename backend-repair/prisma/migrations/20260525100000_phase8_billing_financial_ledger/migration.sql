CREATE TYPE "InvoiceStatus" AS ENUM (
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE "InvoiceItemSourceType" AS ENUM (
  'ESTIMATE',
  'ACTUAL_USAGE',
  'MANUAL',
  'LABOR'
);

CREATE TYPE "RepairPaymentStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'CARD',
  'UPI',
  'BANK_TRANSFER',
  'WALLET'
);

CREATE TYPE "LedgerEntryType" AS ENUM (
  'INVOICE_ISSUED',
  'PAYMENT_RECEIVED',
  'ADJUSTMENT',
  'REFUND'
);

CREATE TYPE "FinancialAuditAction" AS ENUM (
  'INVOICE_CREATED',
  'INVOICE_ISSUED',
  'PAYMENT_COLLECTED',
  'INVOICE_PARTIALLY_PAID',
  'INVOICE_PAID',
  'INVOICE_CANCELLED',
  'REFUND_RECORDED'
);

CREATE TABLE "repair_invoices" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "estimate_id" UUID,
    "issued_by_staff_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "repair_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_invoice_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_invoice_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "source_type" "InvoiceItemSourceType" NOT NULL DEFAULT 'MANUAL',
    "source_ref_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_financial_ledger" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "repair_invoice_id" UUID,
    "repair_payment_id" UUID,
    "actor_staff_id" UUID,
    "type" "LedgerEntryType" NOT NULL,
    "debit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "running_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reference_type" TEXT,
    "reference_id" UUID,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_financial_ledger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_financial_audit_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_invoice_id" UUID,
    "repair_payment_id" UUID,
    "actor_staff_id" UUID,
    "action" "FinancialAuditAction" NOT NULL,
    "previous_status" TEXT,
    "next_status" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_financial_audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "repair_payments"
ADD COLUMN "repair_invoice_id" UUID,
ADD COLUMN "notes" TEXT;

ALTER TABLE "repair_payments"
RENAME COLUMN "reference" TO "transaction_reference";

ALTER TABLE "repair_payments"
RENAME COLUMN "paid_at" TO "collected_at";

ALTER TABLE "repair_payments"
ALTER COLUMN "method" DROP DEFAULT;

UPDATE "repair_payments"
SET "method" = 'CASH'
WHERE "method" IS NULL OR "method" NOT IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'WALLET');

ALTER TABLE "repair_payments"
ALTER COLUMN "method" TYPE "PaymentMethod"
USING "method"::"PaymentMethod";

ALTER TABLE "repair_payments"
ALTER COLUMN "method" SET DEFAULT 'CASH';

ALTER TABLE "repair_payments"
ALTER COLUMN "method" SET NOT NULL;

ALTER TABLE "repair_payments"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "repair_payments"
ALTER COLUMN "status" TYPE "RepairPaymentStatus"
USING (
  CASE
    WHEN "status"::text IN ('PAID', 'PARTIAL') THEN 'COMPLETED'
    WHEN "status"::text = 'CANCELLED' THEN 'FAILED'
    WHEN "status"::text = 'REFUNDED' THEN 'REFUNDED'
    ELSE 'PENDING'
  END
)::"RepairPaymentStatus";

ALTER TABLE "repair_payments"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX "repair_invoices_business_id_invoice_number_key"
ON "repair_invoices"("business_id", "invoice_number");

CREATE INDEX "repair_invoices_business_id_repair_ticket_id_idx"
ON "repair_invoices"("business_id", "repair_ticket_id");

CREATE INDEX "repair_invoices_business_id_customer_id_idx"
ON "repair_invoices"("business_id", "customer_id");

CREATE INDEX "repair_invoices_business_id_estimate_id_idx"
ON "repair_invoices"("business_id", "estimate_id");

CREATE INDEX "repair_invoices_business_id_status_idx"
ON "repair_invoices"("business_id", "status");

CREATE INDEX "repair_invoices_business_id_issued_at_idx"
ON "repair_invoices"("business_id", "issued_at");

CREATE INDEX "repair_invoices_business_id_deleted_at_idx"
ON "repair_invoices"("business_id", "deleted_at");

CREATE INDEX "repair_invoice_items_business_id_repair_invoice_id_idx"
ON "repair_invoice_items"("business_id", "repair_invoice_id");

CREATE INDEX "repair_invoice_items_business_id_source_type_idx"
ON "repair_invoice_items"("business_id", "source_type");

CREATE INDEX "repair_payments_business_id_repair_invoice_id_idx"
ON "repair_payments"("business_id", "repair_invoice_id");

CREATE INDEX "repair_payments_business_id_collected_at_idx"
ON "repair_payments"("business_id", "collected_at");

CREATE INDEX "customer_financial_ledger_business_id_customer_id_created_at_idx"
ON "customer_financial_ledger"("business_id", "customer_id", "created_at");

CREATE INDEX "customer_financial_ledger_business_id_repair_invoice_id_idx"
ON "customer_financial_ledger"("business_id", "repair_invoice_id");

CREATE INDEX "customer_financial_ledger_business_id_repair_payment_id_idx"
ON "customer_financial_ledger"("business_id", "repair_payment_id");

CREATE INDEX "customer_financial_ledger_business_id_type_idx"
ON "customer_financial_ledger"("business_id", "type");

CREATE INDEX "repair_financial_audit_logs_business_id_repair_invoice_id_created_at_idx"
ON "repair_financial_audit_logs"("business_id", "repair_invoice_id", "created_at");

CREATE INDEX "repair_financial_audit_logs_business_id_repair_payment_id_created_at_idx"
ON "repair_financial_audit_logs"("business_id", "repair_payment_id", "created_at");

CREATE INDEX "repair_financial_audit_logs_business_id_action_idx"
ON "repair_financial_audit_logs"("business_id", "action");

ALTER TABLE "repair_invoices"
ADD CONSTRAINT "repair_invoices_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_invoices"
ADD CONSTRAINT "repair_invoices_repair_ticket_id_fkey"
FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_invoices"
ADD CONSTRAINT "repair_invoices_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_invoices"
ADD CONSTRAINT "repair_invoices_estimate_id_fkey"
FOREIGN KEY ("estimate_id") REFERENCES "repair_estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_invoices"
ADD CONSTRAINT "repair_invoices_issued_by_staff_id_fkey"
FOREIGN KEY ("issued_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_invoice_items"
ADD CONSTRAINT "repair_invoice_items_repair_invoice_id_fkey"
FOREIGN KEY ("repair_invoice_id") REFERENCES "repair_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repair_payments"
ADD CONSTRAINT "repair_payments_repair_invoice_id_fkey"
FOREIGN KEY ("repair_invoice_id") REFERENCES "repair_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_financial_ledger"
ADD CONSTRAINT "customer_financial_ledger_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_financial_ledger"
ADD CONSTRAINT "customer_financial_ledger_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_financial_ledger"
ADD CONSTRAINT "customer_financial_ledger_repair_invoice_id_fkey"
FOREIGN KEY ("repair_invoice_id") REFERENCES "repair_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_financial_ledger"
ADD CONSTRAINT "customer_financial_ledger_repair_payment_id_fkey"
FOREIGN KEY ("repair_payment_id") REFERENCES "repair_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_financial_ledger"
ADD CONSTRAINT "customer_financial_ledger_actor_staff_id_fkey"
FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_financial_audit_logs"
ADD CONSTRAINT "repair_financial_audit_logs_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_financial_audit_logs"
ADD CONSTRAINT "repair_financial_audit_logs_repair_invoice_id_fkey"
FOREIGN KEY ("repair_invoice_id") REFERENCES "repair_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_financial_audit_logs"
ADD CONSTRAINT "repair_financial_audit_logs_repair_payment_id_fkey"
FOREIGN KEY ("repair_payment_id") REFERENCES "repair_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_financial_audit_logs"
ADD CONSTRAINT "repair_financial_audit_logs_actor_staff_id_fkey"
FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
