const { z } = require("zod");

const { PRIORITIES, TICKET_STATUSES } = require("../repair/constants");

const uuidSchema = z.string().uuid();
const metadataSchema = z.record(z.string(), z.any()).optional();
const ticketStatusSchema = z.enum(Object.values(TICKET_STATUSES));
const prioritySchema = z.enum(Object.values(PRIORITIES));
const queryBooleanSchema = z.preprocess(
  (value) => (value === undefined ? undefined : String(value)),
  z.enum(["true", "false"]).transform((value) => value === "true")
);

const assignTechnicianSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    technicianId: uuidSchema,
    notes: z.string().trim().max(1000).optional(),
    branchId: uuidSchema.optional(),
    metadata: metadataSchema,
  }),
});

const reassignTechnicianSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    technicianId: uuidSchema,
    reason: z.string().trim().min(3).max(1000),
    notes: z.string().trim().max(1000).optional(),
    branchId: uuidSchema.optional(),
    metadata: metadataSchema,
  }),
});

const getAssignmentHistorySchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  query: z.object({
    branchId: uuidSchema.optional(),
  }).optional(),
});

const technicianQueueSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: ticketStatusSchema.optional(),
    priority: prioritySchema.optional(),
    statusGroup: z.enum(["assigned", "active", "pending_review", "completed"]).optional(),
    waitingApproval: queryBooleanSchema.optional(),
    waitingParts: queryBooleanSchema.optional(),
    overdueOnly: queryBooleanSchema.optional(),
    sort: z
      .enum(["priority", "overdue", "due_at", "assigned_at"])
      .default("priority"),
  }),
});

const technicianDashboardSchema = z.object({
  query: z.object({}).default({}),
});

module.exports = {
  assignTechnicianSchema,
  reassignTechnicianSchema,
  getAssignmentHistorySchema,
  technicianQueueSchema,
  technicianDashboardSchema,
};
