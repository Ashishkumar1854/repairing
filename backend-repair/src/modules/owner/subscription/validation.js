const { z } = require("zod");

const { DURATION_OPTIONS } = require("./constants");

const subscriptionPaymentRequestBody = z.object({
  body: z.object({
    plan: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]),
    durationDays: z.coerce.number().int().refine((value) => DURATION_OPTIONS.includes(value), {
      message: `Duration must be one of: ${DURATION_OPTIONS.join(", ")}`,
    }),
  }),
});

module.exports = {
  subscriptionPaymentRequestBody,
};
