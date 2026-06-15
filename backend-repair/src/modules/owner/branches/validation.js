const { z } = require("zod");

const branchIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const normalizeCode = (value) => value.trim().toUpperCase();

const branchBody = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(40).transform(normalizeCode).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  isMainBranch: z.boolean().optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

const createBranchSchema = z.object({
  body: branchBody,
});

const updateBranchSchema = branchIdParam.extend({
  body: branchBody.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  }),
});

module.exports = {
  branchIdParam,
  createBranchSchema,
  updateBranchSchema,
};
