ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'REASSIGNED';

CREATE TYPE "AssignmentEventType" AS ENUM (
  'ASSIGNED',
  'REASSIGNED',
  'UNASSIGNED'
);

CREATE TYPE "TechnicianActivityType" AS ENUM (
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_REASSIGNED',
  'ASSIGNMENT_ACCEPTED',
  'DIAGNOSIS_STARTED',
  'REPAIR_STARTED',
  'PARTS_CONSUMED',
  'REPAIR_PAUSED',
  'REPAIR_RESUMED',
  'REPAIR_COMPLETED'
);

CREATE TABLE "repair_ticket_assignments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "assigned_to_staff_id" UUID NOT NULL,
    "previous_assigned_to_staff_id" UUID,
    "assigned_by_staff_id" UUID,
    "type" "AssignmentEventType" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_ticket_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_technician_activity_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "repair_ticket_id" UUID NOT NULL,
    "technician_id" UUID NOT NULL,
    "actor_staff_id" UUID,
    "type" "TechnicianActivityType" NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_technician_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repair_ticket_assignments_business_id_repair_ticket_id_assigned_at_idx"
ON "repair_ticket_assignments"("business_id", "repair_ticket_id", "assigned_at");

CREATE INDEX "repair_ticket_assignments_business_id_assigned_to_staff_id_assigned_at_idx"
ON "repair_ticket_assignments"("business_id", "assigned_to_staff_id", "assigned_at");

CREATE INDEX "repair_ticket_assignments_business_id_previous_assigned_to_staff_id_idx"
ON "repair_ticket_assignments"("business_id", "previous_assigned_to_staff_id");

CREATE INDEX "repair_ticket_assignments_business_id_type_idx"
ON "repair_ticket_assignments"("business_id", "type");

CREATE INDEX "repair_technician_activity_logs_business_id_repair_ticket_id_created_at_idx"
ON "repair_technician_activity_logs"("business_id", "repair_ticket_id", "created_at");

CREATE INDEX "repair_technician_activity_logs_business_id_technician_id_created_at_idx"
ON "repair_technician_activity_logs"("business_id", "technician_id", "created_at");

CREATE INDEX "repair_technician_activity_logs_business_id_type_idx"
ON "repair_technician_activity_logs"("business_id", "type");

ALTER TABLE "repair_ticket_assignments"
ADD CONSTRAINT "repair_ticket_assignments_repair_ticket_id_fkey"
FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repair_ticket_assignments"
ADD CONSTRAINT "repair_ticket_assignments_assigned_to_staff_id_fkey"
FOREIGN KEY ("assigned_to_staff_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_ticket_assignments"
ADD CONSTRAINT "repair_ticket_assignments_previous_assigned_to_staff_id_fkey"
FOREIGN KEY ("previous_assigned_to_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_ticket_assignments"
ADD CONSTRAINT "repair_ticket_assignments_assigned_by_staff_id_fkey"
FOREIGN KEY ("assigned_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_technician_activity_logs"
ADD CONSTRAINT "repair_technician_activity_logs_repair_ticket_id_fkey"
FOREIGN KEY ("repair_ticket_id") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "repair_technician_activity_logs"
ADD CONSTRAINT "repair_technician_activity_logs_technician_id_fkey"
FOREIGN KEY ("technician_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_technician_activity_logs"
ADD CONSTRAINT "repair_technician_activity_logs_actor_staff_id_fkey"
FOREIGN KEY ("actor_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
