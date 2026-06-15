const { z } = require("zod");

const businessIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const contactCreateBody = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone is required"),
    shopName: z.string().min(1, "Shop name is required"),
    message: z.string().optional().default(""),
  }),
});

module.exports = {
  businessIdParam,
  contactCreateBody,
};
