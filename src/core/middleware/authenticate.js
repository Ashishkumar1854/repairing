const AppError = require("../../shared/errors/AppError");
const { verifyAccessToken } = require("../../shared/utils/jwt");
const { AUTH_ERRORS } = require("../../modules/auth/constants");

const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(
      new AppError("Authentication required", 401, {
        code: AUTH_ERRORS.UNAUTHORIZED,
      })
    );
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    const payload = verifyAccessToken(token);

    if (!payload.staffId || !payload.businessId || !payload.role) {
      throw new Error("Invalid token payload");
    }

    req.user = {
      staffId: payload.staffId,
      businessId: payload.businessId,
      role: payload.role,
    };

    return next();
  } catch (error) {
    return next(
      new AppError("Invalid or expired access token", 401, {
        code: AUTH_ERRORS.UNAUTHORIZED,
      })
    );
  }
};

module.exports = authenticate;
