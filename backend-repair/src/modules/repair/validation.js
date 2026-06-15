const { z } = require("zod");

const { PRIORITIES, TICKET_STATUSES } = require("./constants");

const uuidSchema = z.string().uuid();
const prioritySchema = z.enum(Object.values(PRIORITIES));
const ticketStatusSchema = z.enum(Object.values(TICKET_STATUSES));

const metadataSchema = z.record(z.string(), z.any()).optional();

const customerInputSchema = z.object({
  id: uuidSchema.optional(),
  fullName: z.string().trim().min(2).max(160).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().min(5).max(32).optional(),
  address: z.string().trim().max(500).optional(),
  metadata: metadataSchema,
});

const ticketItemSchema = z.object({
  itemType: z.string().trim().min(2).max(80),
  brand: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  serialNumber: z.string().trim().max(120).optional(),
  imei: z.string().trim().max(32).optional(),
  condition: z.string().trim().max(500).optional(),
  accessories: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  lockPin: z.string().trim().max(64).optional(),
  metadata: metadataSchema,
});

const ticketIssueSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  isConfirmed: z.boolean().optional(),
});

const createTicketSchema = z.object({
  body: z
    .object({
      customer: customerInputSchema,
      title: z.string().trim().min(2).max(180),
      description: z.string().trim().max(2000).optional(),
      priority: prioritySchema.default(PRIORITIES.NORMAL),
      dueAt: z.coerce.date().optional(),
      items: z.array(ticketItemSchema).min(1).max(20),
      issues: z.array(ticketIssueSchema).min(1).max(30),
      branchId: uuidSchema.optional().nullable(),
      metadata: metadataSchema,
    })
    .superRefine((value, ctx) => {
      if (!value.customer.id && (!value.customer.fullName || !value.customer.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer"],
          message: "Either customer.id or customer fullName and phone are required",
        });
      }
    }),
});

const listTicketsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: ticketStatusSchema.optional(),
    priority: prioritySchema.optional(),
    search: z.string().trim().min(1).max(120).optional(),
    customerId: uuidSchema.optional(),
    branchId: uuidSchema.optional(),
  }),
});

const getTicketSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  query: z.object({
    branchId: uuidSchema.optional(),
  }).optional(),
});

const updateTicketStatusSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    status: ticketStatusSchema,
    reason: z.string().trim().min(2).max(1000).optional(),
    branchId: uuidSchema.optional(),
    metadata: metadataSchema,
  }),
});

const updateTicketExecutionSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    diagnosis: z.string().trim().max(5000).optional().nullable(),
    repairNotes: z.string().trim().max(5000).optional().nullable(),
    workPerformed: z.string().trim().max(5000).optional().nullable(),
    laborCost: z.coerce.number().nonnegative().optional(),
    estimatedCompletionTime: z.preprocess(
      (val) => (val === "" || val === null ? null : val),
      z.string().datetime().nullable().optional()
    ),
    repairRemarks: z.string().trim().max(5000).optional().nullable(),
    internalNotes: z.string().trim().max(5000).optional().nullable(),
  }),
});

module.exports = {
  createTicketSchema,
  listTicketsSchema,
  getTicketSchema,
  updateTicketStatusSchema,
  updateTicketExecutionSchema,
};
