const { z } = require("zod");

const { INVOICE_STATUSES, PAYMENT_METHODS } = require("./constants");

const uuidSchema = z.string().uuid();
const metadataSchema = z.record(z.string(), z.any()).optional();
const moneySchema = z.coerce.number().finite().min(0).max(9999999.99);
const positiveMoneySchema = z.coerce.number().finite().positive().max(9999999.99);
const quantitySchema = z.coerce.number().finite().positive().max(999999.99);
const taxRateSchema = z.coerce.number().finite().min(0).max(100);

const manualInvoiceItemSchema = z.object({
  itemType: z.string().trim().min(1).max(80).default("MANUAL"),
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(1000).optional(),
  quantity: quantitySchema.default(1),
  unitPrice: moneySchema,
  sourceType: z.enum(["MANUAL", "LABOR"]).default("MANUAL"),
  metadata: metadataSchema,
});

const generateInvoiceSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    estimateId: uuidSchema.optional(),
    includeApprovedEstimate: z.boolean().default(true),
    includeActualUsage: z.boolean().default(false),
    manualItems: z.array(manualInvoiceItemSchema).max(100).default([]),
    discountAmount: moneySchema.default(0),
    taxRate: taxRateSchema.default(0),
    dueDate: z.coerce.date().optional(),
    notes: z.string().trim().max(2000).optional(),
    metadata: metadataSchema,
  }),
});

const listInvoicesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(Object.values(INVOICE_STATUSES)).optional(),
    customerId: uuidSchema.optional(),
    repairTicketId: uuidSchema.optional(),
    search: z.string().trim().min(1).max(120).optional(),
  }),
});

const getInvoiceSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

const collectPaymentSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    amount: positiveMoneySchema,
    method: z.enum(Object.values(PAYMENT_METHODS)),
    transactionReference: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(1000).optional(),
    metadata: metadataSchema,
  }),
});

const customerLedgerSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

module.exports = {
  generateInvoiceSchema,
  listInvoicesSchema,
  getInvoiceSchema,
  collectPaymentSchema,
  customerLedgerSchema,
};
