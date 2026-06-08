const { z } = require("zod");

const uuidSchema = z.string().uuid();
const metadataSchema = z.record(z.string(), z.any()).optional();
const moneySchema = z.coerce.number().finite().min(0).max(9999999.99);
const quantitySchema = z.coerce.number().finite().min(0).max(999999.99);
const positiveQuantitySchema = z.coerce.number().finite().positive().max(999999.99);
const queryBooleanSchema = z.preprocess(
  (value) => (value === undefined ? undefined : String(value)),
  z.enum(["true", "false"]).transform((value) => value === "true")
);

const createInventoryItemSchema = z.object({
  body: z.object({
    sku: z.string().trim().min(1).max(120).transform((value) => value.toUpperCase()),
    partName: z.string().trim().min(2).max(180),
    category: z.string().trim().max(120).optional(),
    stockQuantity: quantitySchema.default(0),
    reservedQuantity: quantitySchema.default(0),
    unitCost: moneySchema.default(0),
    sellingPrice: moneySchema.optional(),
    reorderLevel: quantitySchema.default(0),
    vendorId: uuidSchema.optional(),
    barcode: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(1000).optional(),
    metadata: metadataSchema,
  }),
});

const listInventoryItemsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().max(120).optional(),
    isActive: queryBooleanSchema.optional(),
    lowStockOnly: queryBooleanSchema.optional().default(false),
  }),
});

const getInventoryItemSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

const updateInventoryItemSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z
    .object({
      partName: z.string().trim().min(2).max(180).optional(),
      category: z.string().trim().max(120).optional(),
      unitCost: moneySchema.optional(),
      sellingPrice: moneySchema.optional(),
      reorderLevel: quantitySchema.optional(),
      vendorId: uuidSchema.nullable().optional(),
      barcode: z.string().trim().max(120).nullable().optional(),
      isActive: z.boolean().optional(),
      stockQuantity: quantitySchema.optional(),
      notes: z.string().trim().max(1000).optional(),
      metadata: metadataSchema,
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    }),
});

const consumePartSchema = z.object({
  inventoryItemId: uuidSchema,
  quantity: positiveQuantitySchema,
  notes: z.string().trim().max(1000).optional(),
  metadata: metadataSchema,
});

const consumePartsSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    parts: z.array(consumePartSchema).min(1).max(100),
    technicianNotes: z
      .array(
        z.object({
          note: z.string().trim().min(2).max(4000),
          isInternal: z.boolean().default(true),
          metadata: metadataSchema,
        })
      )
      .max(20)
      .optional(),
    metadata: metadataSchema,
  }),
});

const partsUsageHistorySchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

module.exports = {
  createInventoryItemSchema,
  listInventoryItemsSchema,
  getInventoryItemSchema,
  updateInventoryItemSchema,
  consumePartsSchema,
  partsUsageHistorySchema,
};
