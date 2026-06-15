const { z } = require("zod");

const { ESTIMATE_ITEM_TYPES } = require("./constants");

const uuidSchema = z.string().uuid();
const metadataSchema = z.record(z.string(), z.any()).optional();
const moneySchema = z.coerce.number().finite().min(0).max(9999999.99);
const quantitySchema = z.coerce.number().finite().positive().max(999999.99);

const estimateLineItemSchema = z.object({
  itemType: z.enum(Object.values(ESTIMATE_ITEM_TYPES)),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  sku: z.string().trim().max(120).optional(),
  inventoryRef: z.string().trim().max(160).optional(),
  quantity: quantitySchema.default(1),
  unitAmount: moneySchema,
  metadata: metadataSchema,
});

const diagnosisSchema = z.object({
  diagnosis: z.string().trim().min(3).max(4000),
  estimatedRepairNotes: z.string().trim().max(4000).optional(),
  estimatedTurnaroundHours: z.coerce.number().int().positive().max(8760).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
  metadata: metadataSchema,
});

const technicianNoteSchema = z.object({
  note: z.string().trim().min(2).max(4000),
  isInternal: z.boolean().default(true),
  metadata: metadataSchema,
});

const createEstimateSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    diagnosis: diagnosisSchema,
    items: z.array(estimateLineItemSchema).min(1).max(100),
    discountAmount: moneySchema.default(0),
    taxRate: z.coerce.number().finite().min(0).max(100).default(0),
    validUntil: z.coerce.date().optional(),
    notes: z.string().trim().max(4000).optional(),
    technicianNotes: z.array(technicianNoteSchema).max(20).optional(),
    branchId: uuidSchema.optional(),
    metadata: metadataSchema,
  }),
});

const getEstimateSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  query: z.object({
    branchId: uuidSchema.optional(),
  }).optional(),
});

const approvalActionSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    notes: z.string().trim().max(2000).optional(),
    branchId: uuidSchema.optional(),
    metadata: metadataSchema,
  }),
});

module.exports = {
  createEstimateSchema,
  getEstimateSchema,
  approvalActionSchema,
};
