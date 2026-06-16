const { z } = require("zod");

const businessIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const subscriptionUpdateBody = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      plan: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]).optional(),
      status: z
        .enum(["PENDING", "DONE", "ACTIVE", "TRIALING", "EXPIRED", "SUSPENDED", "CANCELLED"])
        .optional(),
      startsAt: z.coerce.date().optional(),
      expiresAt: z.coerce.date().nullable().optional(),
      addDays: z.coerce.number().int().positive().max(3650).optional(),
    })
    .refine(
      (value) =>
        value.plan !== undefined ||
        value.status !== undefined ||
        value.startsAt !== undefined ||
        value.expiresAt !== undefined ||
        value.addDays !== undefined,
      "At least one subscription field is required"
    ),
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
  subscriptionUpdateBody,
  contactCreateBody,
};
