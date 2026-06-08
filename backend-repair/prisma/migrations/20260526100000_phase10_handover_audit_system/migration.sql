CREATE TYPE "CustodyHolderType" AS ENUM (
  'RECEPTION',
  'TECHNICIAN',
  'VENDOR',
  'CUSTOMER',
  'STORAGE'
);

CREATE TYPE "RepairTicketHandoverType" AS ENUM (
  'RECEPTION_TO_TECHNICIAN',
  'TECHNICIAN_TO_RECEPTION',
  'TECHNICIAN_TO_VENDOR',
  'VENDOR_TO_RECEPTION',
  'RECEPTION_TO_CUSTOMER',
  'INTERNAL_TRANSFER',
  'STORAGE_TRANSFER'
);

ALTER TABLE "repair_tickets"
ADD COLUMN "current_holder_type" "CustodyHolderType" NOT NULL DEFAULT 'RECEPTION',
ADD COLUMN "current_holder_id" UUID,
ADD COLUMN "current_location" TEXT,
ADD COLUMN "last_handover_at" TIMESTAMP(3);

CREATE TABLE "repair_ticket_handovers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "vendor_id" UUID,
    "actor_staff_id" UUID,
    "from_holder_type" "CustodyHolderType" NOT NULL,
    "from_holder_id" UUID,
    "to_holder_type" "CustodyHolderType" NOT NULL,
    "to_holder_id" UUID,
    "type" "RepairTicketHandoverType" NOT NULL,
    "current_location" TEXT,
    "receiver_name" TEXT,
    "verification_token" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "handed_over_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_ticket_handovers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repair_tickets_business_id_current_holder_type_idx" ON "repair_tickets"("business_id", "current_holder_type");
CREATE INDEX "repair_ticket_handovers_business_id_repair_ticket_id_handed_over_at_idx" ON "repair_ticket_handovers"("business_id", "repair_ticket_id", "handed_over_at");
CREATE INDEX "repair_ticket_handovers_business_id_type_idx" ON "repair_ticket_handovers"("business_id", "type");
CREATE INDEX "repair_ticket_handovers_business_id_from_holder_type_idx" ON "repair_ticket_handovers"("business_id", "from_holder_type");
CREATE INDEX "repair_ticket_handovers_business_id_to_holder_type_idx" ON "repair_ticket_handovers"("business_id", "to_holder_type");
CREATE INDEX "repair_ticket_handovers_business_id_vendor_id_idx" ON "repair_ticket_handovers"("business_id", "vendor_id");
CREATE INDEX "repair_ticket_handovers_business_id_actor_staff_id_idx" ON "repair_ticket_handovers"("business_id", "actor_staff_id");

ALTER TABLE "repair_ticket_handovers"
ADD CONSTRAINT "repair_ticket_handovers_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_ticket_handovers"
ADD CONSTRAINT "repair_ticket_handovers_repair_ticket_id_fkey"
FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repair_ticket_handovers"
ADD CONSTRAINT "repair_ticket_handovers_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_ticket_handovers"
ADD CONSTRAINT "repair_ticket_handovers_actor_staff_id_fkey"
FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
