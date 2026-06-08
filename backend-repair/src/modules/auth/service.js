const AppError = require("../../shared/errors/AppError");
const { comparePassword, hashPassword } = require("../../shared/utils/password");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../../shared/utils/jwt");
const authRepository = require("./repository");
const { AUTH_ERRORS } = require("./constants");

const toAuthUser = (staff) => ({
  staffId: staff.id,
  businessId: staff.businessId,
  role: staff.role,
});

const toPublicStaff = (staff) => ({
  id: staff.id,
  businessId: staff.businessId,
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
};

const login = async ({ email, password }) => {
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

module.exports = {
  login,
  refresh,
  me,
  logout,
};
