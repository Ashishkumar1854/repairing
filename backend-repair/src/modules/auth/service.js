const crypto = require("crypto");

const AppError = require("../../shared/errors/AppError");
const { comparePassword, hashPassword } = require("../../shared/utils/password");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../../shared/utils/jwt");
const authRepository = require("./repository");
const { AUTH_ERRORS } = require("./constants");
const { shapeSubscription } = require("../../shared/utils/subscription");

const toAuthUser = (staff) => ({
  staffId: staff.id,
  businessId: staff.businessId,
  branchId: staff.branchId,
  role: staff.role,
});

const toPublicStaff = (staff) => ({
  id: staff.id,
  businessId: staff.businessId,
  branchId: staff.branchId,
  fullName: staff.fullName,
  email: staff.email,
  role: staff.role,
  isActive: staff.isActive,
  business: staff.business
    ? {
        id: staff.business.id,
        name: staff.business.name,
        slug: staff.business.slug,
        type: staff.business.type,
        status: staff.business.status,
        subscription: shapeSubscription(staff.business.subscription),
      }
    : null,
  branch: staff.branch
    ? {
        id: staff.branch.id,
        name: staff.branch.name,
        code: staff.branch.code,
        status: staff.branch.status,
        metadata: staff.branch.metadata,
      }
    : null,
});

const getRefreshTokenExpiry = (refreshToken) => {
  const payload = verifyRefreshToken(refreshToken);
  return new Date(payload.exp * 1000);
};

const issueTokenPair = async (staff) => {
  const tokenPayload = toAuthUser(staff);
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  const refreshTokenHash = await hashPassword(refreshToken);
  const refreshTokenExpiresAt = getRefreshTokenExpiry(refreshToken);

  await authRepository.updateRefreshToken(
    staff.id,
    staff.businessId,
    refreshTokenHash,
    refreshTokenExpiresAt
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
};

const assertUsableStaff = (staff) => {
  if (!staff || staff.deletedAt || staff.business?.deletedAt) {
    throw new AppError("Invalid credentials", 401, {
      code: AUTH_ERRORS.INVALID_CREDENTIALS,
    });
  }

  if (!staff.isActive) {
    throw new AppError("Staff account is inactive", 403, {
      code: AUTH_ERRORS.ACCOUNT_INACTIVE,
    });
  }

  if (staff.role !== "SUPER_ADMIN" && staff.business?.status === "SUSPENDED") {
    throw new AppError("Business account is suspended", 403, {
      code: AUTH_ERRORS.BUSINESS_SUSPENDED,
    });
  }
};

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const slugify = (value) => {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `repair-shop-${Date.now()}`;
};

const getAvailableSlug = async (shopName) => {
  const baseSlug = slugify(shopName);
  let candidate = baseSlug;
  let suffix = 1;

  while (await authRepository.findBusinessBySlug(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
};

const signup = async ({ name, mobile, shopName, address, email, password }) => {
  const matchingStaff = await authRepository.findStaffByEmail(email);
  if (matchingStaff.length > 0) {
    throw new AppError("An account already exists with this email", 409, {
      code: "EMAIL_ALREADY_REGISTERED",
    });
  }

  const passwordHash = await hashPassword(password);
  const slug = await getAvailableSlug(shopName);

  const result = await authRepository.createOwnerTenant({
    business: {
      name: shopName,
      slug,
      type: "REPAIR_SHOP",
      status: "ACTIVE",
      email,
      phone: mobile,
      address,
      metadata: {
        signupSource: "public_owner_signup",
      },
    },
    branch: {
      name: "Main Branch",
      code: "MAIN",
      phone: mobile,
      email,
      address,
      isMainBranch: true,
      status: "ACTIVE",
    },
    owner: {
      branchId: null,
      fullName: name,
      email,
      phone: mobile,
      passwordHash,
      role: "OWNER",
      isActive: true,
    },
    subscription: {
      plan: "STARTER",
      status: "PENDING",
      metadata: {
        signupSource: "public_owner_signup",
      },
    },
  });

  return {
    business: {
      id: result.business.id,
      name: result.business.name,
      slug: result.business.slug,
      status: result.business.status,
    },
    owner: toPublicStaff(result.owner),
    subscription: shapeSubscription(result.subscription),
  };
};

const login = async ({ email, password, branchName }) => {
  const matchingStaff = await authRepository.findStaffByEmail(email);

  if (matchingStaff.length === 0) {
    throw new AppError("Invalid credentials", 401, {
      code: AUTH_ERRORS.INVALID_CREDENTIALS,
    });
  }

  if (matchingStaff.length > 1) {
    throw new AppError("Unable to resolve tenant for this staff account", 409, {
      code: AUTH_ERRORS.TENANT_AMBIGUOUS,
    });
  }

  const staff = matchingStaff[0];
  assertUsableStaff(staff);

  const passwordMatches = await comparePassword(password, staff.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid credentials", 401, {
      code: AUTH_ERRORS.INVALID_CREDENTIALS,
    });
  }

  if (["ADMIN", "TECHNICIAN"].includes(staff.role)) {
    if (!branchName) {
      throw new AppError("Branch name is required for branch staff", 400, {
        code: "BRANCH_NAME_REQUIRED",
      });
    }
    if (!staff.branch || staff.branch.deletedAt || staff.branch.status !== "ACTIVE" || staff.branch.name.trim().toLowerCase() !== branchName.trim().toLowerCase()) {
      throw new AppError("Invalid branch name for this staff member", 400, {
        code: "INVALID_BRANCH",
      });
    }
  }

  const tokens = await issueTokenPair(staff);

  return {
    user: toPublicStaff(staff),
    tokens,
  };
};

const refresh = async ({ refreshToken }) => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError("Invalid or expired refresh token", 401, {
      code: AUTH_ERRORS.INVALID_REFRESH_TOKEN,
    });
  }

  const staff = await authRepository.findStaffById(payload.staffId);
  assertUsableStaff(staff);

  if (staff.businessId !== payload.businessId || staff.role !== payload.role) {
    throw new AppError("Invalid refresh token", 401, {
      code: AUTH_ERRORS.INVALID_REFRESH_TOKEN,
    });
  }

  if (!staff.refreshTokenHash || !staff.refreshTokenExpiresAt) {
    throw new AppError("Refresh session not found", 401, {
      code: AUTH_ERRORS.INVALID_REFRESH_TOKEN,
    });
  }

  if (staff.refreshTokenExpiresAt.getTime() <= Date.now()) {
    await authRepository.clearRefreshToken(staff.id, staff.businessId);
    throw new AppError("Refresh token expired", 401, {
      code: AUTH_ERRORS.INVALID_REFRESH_TOKEN,
    });
  }

  const refreshTokenMatches = await comparePassword(
    refreshToken,
    staff.refreshTokenHash
  );

  if (!refreshTokenMatches) {
    throw new AppError("Invalid refresh token", 401, {
      code: AUTH_ERRORS.INVALID_REFRESH_TOKEN,
    });
  }

  const tokens = await issueTokenPair(staff);

  return {
    user: toPublicStaff(staff),
    tokens,
  };
};

const me = async ({ staffId, businessId }) => {
  const staff = await authRepository.findStaffByIdForBusiness(staffId, businessId);

  if (!staff || !staff.isActive) {
    throw new AppError("Authenticated staff account not found", 401, {
      code: AUTH_ERRORS.UNAUTHORIZED,
    });
  }

  return toPublicStaff(staff);
};

const logout = async ({ staffId, businessId }) => {
  await authRepository.clearRefreshToken(staffId, businessId);

  return {
    loggedOut: true,
  };
};

const forgotPassword = async ({ email }) => {
  const matchingStaff = await authRepository.findStaffByEmail(email);
  const staff = matchingStaff.length === 1 ? matchingStaff[0] : null;

  if (!staff || !["OWNER", "SUPER_ADMIN"].includes(staff.role)) {
    return { accepted: true };
  }

  assertUsableStaff(staff);

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await authRepository.setPasswordResetToken(
    staff.id,
    staff.businessId,
    hashResetToken(resetToken),
    resetTokenExpiresAt
  );

  return {
    accepted: true,
    resetToken: process.env.NODE_ENV === "production" ? undefined : resetToken,
    resetTokenExpiresAt,
  };
};

const resetPassword = async ({ token, password }) => {
  const staff = await authRepository.findStaffByResetTokenHash(hashResetToken(token));

  if (
    !staff ||
    !["OWNER", "SUPER_ADMIN"].includes(staff.role) ||
    !staff.passwordResetExpiresAt ||
    staff.passwordResetExpiresAt.getTime() <= Date.now()
  ) {
    throw new AppError("Invalid or expired reset token", 400, {
      code: "INVALID_RESET_TOKEN",
    });
  }

  assertUsableStaff(staff);
  await authRepository.updatePassword(staff.id, staff.businessId, await hashPassword(password));

  return { reset: true };
};

const changePassword = async ({ staffId, businessId }, { currentPassword, newPassword }) => {
  const staff = await authRepository.findStaffById(staffId);

  if (!staff || staff.businessId !== businessId || !["OWNER", "SUPER_ADMIN"].includes(staff.role)) {
    throw new AppError("Insufficient permissions", 403, {
      code: AUTH_ERRORS.FORBIDDEN,
    });
  }

  assertUsableStaff(staff);

  const passwordMatches = await comparePassword(currentPassword, staff.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Current password is incorrect", 400, {
      code: "INVALID_CURRENT_PASSWORD",
    });
  }

  await authRepository.updatePassword(staffId, businessId, await hashPassword(newPassword));

  return { changed: true };
};

const getBranchesByEmail = async (email) => {
  const matchingStaff = await authRepository.findStaffByEmail(email);
  if (matchingStaff.length === 0) {
    return { branches: [] };
  }

  const staff = matchingStaff[0];
  const prisma = require("../../core/database/prisma");
  const branches = await prisma.branch.findMany({
    where: {
      businessId: staff.businessId,
      status: "ACTIVE",
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  return { branches };
};

module.exports = {
  signup,
  login,
  refresh,
  me,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getBranchesByEmail,
};
