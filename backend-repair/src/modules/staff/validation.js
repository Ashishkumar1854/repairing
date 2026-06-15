const { z } = require("zod");

const staffIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const managedStaffRole = z.enum(["ADMIN", "TECHNICIAN"]);

const createStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(40).optional().nullable(),
    password: z.string().min(8).max(256),
    branchId: z.string().uuid().optional().nullable(),
    role: managedStaffRole.optional().nullable(),
  }),
});

const resetTechnicianPasswordSchema = staffIdParam.extend({
  body: z.object({
    password: z.string().min(8).max(256),
  }),
});

const assignBranchSchema = staffIdParam.extend({
  body: z.object({
    branchId: z.string().uuid(),
  }),
});

const listStaffSchema = z.object({
  query: z.object({
    branchId: z.string().uuid().optional(),
  }).optional(),
});

module.exports = {
  staffIdParam,
  createStaffSchema,
  resetTechnicianPasswordSchema,
  assignBranchSchema,
  listStaffSchema,
};
