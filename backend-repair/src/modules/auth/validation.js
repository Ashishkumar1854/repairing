const { z } = require("zod");

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(256),
    branchName: z.string().trim().optional().nullable(),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    password: z.string().min(8).max(256),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8).max(256),
    newPassword: z.string().min(8).max(256),
  }),
});

const branchesByEmailSchema = z.object({
  query: z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
  }),
});

module.exports = {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  branchesByEmailSchema,
};
