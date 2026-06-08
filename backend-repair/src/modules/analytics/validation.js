const { z } = require("zod");

const { ANALYTICS_PERIODS } = require("./constants");

const dateRangeQuery = z
  .object({
    period: z.enum(Object.values(ANALYTICS_PERIODS)).default(ANALYTICS_PERIODS.MONTH),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.period === ANALYTICS_PERIODS.CUSTOM && (!value.from || !value.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "Custom analytics range requires from and to dates",
      });
    }

    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "Date range end must be greater than or equal to start",
      });
    }
  });

const analyticsQuerySchema = z.object({
  query: dateRangeQuery,
});

module.exports = {
  analyticsQuerySchema,
};
