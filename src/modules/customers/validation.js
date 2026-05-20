const { z } = require("zod");

const searchCustomersSchema = z.object({
  query: z.object({
    query: z.string().trim().min(1).max(120),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

const customerTicketsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

module.exports = {
  searchCustomersSchema,
  customerTicketsSchema,
};
