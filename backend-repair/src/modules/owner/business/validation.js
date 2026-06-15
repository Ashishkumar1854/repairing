const { z } = require("zod");

const optionalText = (max = 500) => z.string().trim().max(max).optional().nullable();

const updateBusinessProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
    description: optionalText(1000),
    logo: optionalText(1000),
    banner: optionalText(1000),
    phone: optionalText(40),
    email: z.string().trim().email().optional().nullable(),
    website: optionalText(255),
    country: optionalText(100),
    state: optionalText(100),
    city: optionalText(100),
    address: optionalText(500),
    gstNumber: optionalText(80),
  }),
});

module.exports = {
  updateBusinessProfileSchema,
};
