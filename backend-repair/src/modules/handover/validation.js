const { z } = require("zod");

const { CUSTODY_HOLDER_TYPES, HANDOVER_TYPES } = require("./constants");

const uuidSchema = z.string().uuid();
const metadataSchema = z.record(z.string(), z.any()).optional();

const handoverSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    type: z.enum(Object.values(HANDOVER_TYPES)),
    toHolderType: z.enum(Object.values(CUSTODY_HOLDER_TYPES)).optional(),
    toHolderId: uuidSchema.optional(),
    vendorId: uuidSchema.optional(),
    currentLocation: z.string().trim().min(1).max(160).optional(),
    receiverName: z.string().trim().min(1).max(160).optional(),
    notes: z.string().trim().max(2000).optional(),
    verificationToken: z.string().trim().max(160).optional(),
    branchId: uuidSchema.optional(),
    metadata: metadataSchema,
  }),
});

const ticketCustodySchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  query: z.object({
    branchId: uuidSchema.optional(),
  }).optional(),
});

module.exports = {
  handoverSchema,
  ticketCustodySchema,
};
