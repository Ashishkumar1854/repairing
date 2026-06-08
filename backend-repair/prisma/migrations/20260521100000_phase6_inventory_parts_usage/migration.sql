CREATE TYPE "InventoryMovementType" AS ENUM (
  'STOCK_IN',
  'STOCK_OUT',
  'CONSUMED',
  'ADJUSTMENT',
  'RETURNED',
  'TRANSFERRED'
);

ALTER TABLE "repair_parts_usage"
ADD COLUMN "inventory_item_id" UUID,
ADD COLUMN "notes" TEXT;

CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "vendor_id" UUID,
    "sku" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "category" TEXT,
    "stock_quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reserved_quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "selling_price" DECIMAL(12,2),
    "reorder_level" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_stock_movements" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "repair_ticket_id" UUID,
    "actor_staff_id" UUID,
    "technician_id" UUID,
    "type" "InventoryMovementType" NOT NULL,
    "quantity_before" DECIMAL(12,2) NOT NULL,
    "quantity_changed" DECIMAL(12,2) NOT NULL,
    "quantity_after" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_items_business_id_sku_key"
ON "inventory_items"("business_id", "sku");

CREATE INDEX "inventory_items_business_id_part_name_idx"
ON "inventory_items"("business_id", "part_name");

CREATE INDEX "inventory_items_business_id_category_idx"
ON "inventory_items"("business_id", "category");

CREATE INDEX "inventory_items_business_id_barcode_idx"
ON "inventory_items"("business_id", "barcode");

CREATE INDEX "inventory_items_business_id_is_active_idx"
ON "inventory_items"("business_id", "is_active");

CREATE INDEX "inventory_items_business_id_deleted_at_idx"
ON "inventory_items"("business_id", "deleted_at");

CREATE INDEX "inventory_stock_movements_business_id_inventory_item_id_created_at_idx"
ON "inventory_stock_movements"("business_id", "inventory_item_id", "created_at");

CREATE INDEX "inventory_stock_movements_business_id_repair_ticket_id_idx"
ON "inventory_stock_movements"("business_id", "repair_ticket_id");

CREATE INDEX "inventory_stock_movements_business_id_technician_id_idx"
ON "inventory_stock_movements"("business_id", "technician_id");

CREATE INDEX "inventory_stock_movements_business_id_type_idx"
ON "inventory_stock_movements"("business_id", "type");

CREATE INDEX "inventory_stock_movements_business_id_created_at_idx"
ON "inventory_stock_movements"("business_id", "created_at");

CREATE INDEX "repair_parts_usage_business_id_inventory_item_id_idx"
ON "repair_parts_usage"("business_id", "inventory_item_id");

ALTER TABLE "inventory_items"
ADD CONSTRAINT "inventory_items_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_items"
ADD CONSTRAINT "inventory_items_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_stock_movements"
ADD CONSTRAINT "inventory_stock_movements_business_id_fkey"
FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_stock_movements"
ADD CONSTRAINT "inventory_stock_movements_inventory_item_id_fkey"
FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_stock_movements"
ADD CONSTRAINT "inventory_stock_movements_repair_ticket_id_fkey"
FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_stock_movements"
ADD CONSTRAINT "inventory_stock_movements_actor_staff_id_fkey"
FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_stock_movements"
ADD CONSTRAINT "inventory_stock_movements_technician_id_fkey"
FOREIGN KEY ("technician_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_parts_usage"
ADD CONSTRAINT "repair_parts_usage_inventory_item_id_fkey"
FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
