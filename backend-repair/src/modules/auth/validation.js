const { z } = require("zod");

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(256),
    branchName: z.string().trim().optional().nullable(),
  }),
});

const signupSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, "Name is required").max(120),
      mobile: z.string().trim().min(7, "Mobile number is required").max(20),
      shopName: z.string().trim().min(1, "Shop name is required").max(160),
      address: z.string().trim().min(1, "Address is required").max(500),
      email: z.string().trim().email().transform((value) => value.toLowerCase()),
      confirmEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
      password: z.string().min(8).max(256),
      confirmPassword: z.string().min(8).max(256),
    })
    .refine((value) => value.email === value.confirmEmail, {
      message: "Email and confirm email must match",
      path: ["confirmEmail"],
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "Password and confirm password must match",
      path: ["confirmPassword"],
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
  signupSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  branchesByEmailSchema,
};
