const { z } = require("zod");

const { VENDOR_COST_STATUSES, VENDOR_REPAIR_STATUSES } = require("./constants");

const uuidSchema = z.string().uuid();
const metadataSchema = z.record(z.string(), z.any()).optional();
const moneySchema = z.coerce.number().finite().min(0).max(99999999.99);
const queryBooleanSchema = z.preprocess(
  (value) => (value === undefined ? undefined : String(value)),
  z.enum(["true", "false"]).transform((value) => value === "true")
);

const createVendorSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(180),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    phone: z.string().trim().max(40).optional(),
    address: z.string().trim().max(800).optional(),
    metadata: metadataSchema,
  }),
});

const updateVendorSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(180).optional(),
      email: z.string().trim().email().transform((value) => value.toLowerCase()).nullable().optional(),
      phone: z.string().trim().max(40).nullable().optional(),
      address: z.string().trim().max(800).nullable().optional(),
      isActive: z.boolean().optional(),
      metadata: metadataSchema,
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    }),
});

const listVendorsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).max(120).optional(),
    isActive: queryBooleanSchema.optional(),
  }),
});

const getVendorSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

const dispatchVendorRepairSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    branchId: uuidSchema.optional(),
    vendorId: uuidSchema,
    externalRef: z.string().trim().max(160).optional(),
    issueDescription: z.string().trim().max(3000).optional(),
    dispatchNotes: z.string().trim().max(3000).optional(),
    expectedReturnAt: z.coerce.date().optional(),
    estimatedCost: moneySchema.optional(),
    currentLocation: z.string().trim().min(1).max(160).optional(),
    metadata: metadataSchema,
  }),
});

const listVendorRepairJobsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    vendorId: uuidSchema.optional(),
    branchId: uuidSchema.optional(),
    repairTicketId: uuidSchema.optional(),
    status: z.enum(Object.values(VENDOR_REPAIR_STATUSES)).optional(),
    costStatus: z.enum(Object.values(VENDOR_COST_STATUSES)).optional(),
    search: z.string().trim().min(1).max(120).optional(),
  }),
});

const getVendorRepairJobSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  query: z.object({
    branchId: uuidSchema.optional(),
  }).optional(),
});

const updateVendorRepairStatusSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    branchId: uuidSchema.optional(),
    status: z.enum([
      VENDOR_REPAIR_STATUSES.IN_PROGRESS,
      VENDOR_REPAIR_STATUSES.WAITING_VENDOR_QUOTE,
      VENDOR_REPAIR_STATUSES.COMPLETED,
      VENDOR_REPAIR_STATUSES.CANCELLED,
    ]),
    vendorDiagnosis: z.string().trim().max(3000).optional(),
    vendorResolution: z.string().trim().max(3000).optional(),
    notes: z.string().trim().max(3000).optional(),
    metadata: metadataSchema,
  }),
});

const receiveVendorRepairSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    branchId: uuidSchema.optional(),
    nextTicketStatus: z.enum(["IN_REPAIR", "READY_FOR_DELIVERY"]).default("IN_REPAIR"),
    vendorResolution: z.string().trim().max(3000).optional(),
    currentLocation: z.string().trim().min(1).max(160).default("Reception"),
    notes: z.string().trim().max(3000).optional(),
    metadata: metadataSchema,
  }),
});

const recordVendorRepairCostSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    branchId: uuidSchema.optional(),
    estimatedCost: moneySchema.optional(),
    approvedCost: moneySchema.optional(),
    finalCost: moneySchema.optional(),
    costStatus: z.enum(Object.values(VENDOR_COST_STATUSES)),
    notes: z.string().trim().max(3000).optional(),
    metadata: metadataSchema,
  }),
});

module.exports = {
  createVendorSchema,
  updateVendorSchema,
  listVendorsSchema,
  getVendorSchema,
  dispatchVendorRepairSchema,
  listVendorRepairJobsSchema,
  getVendorRepairJobSchema,
  updateVendorRepairStatusSchema,
  receiveVendorRepairSchema,
  recordVendorRepairCostSchema,
};
