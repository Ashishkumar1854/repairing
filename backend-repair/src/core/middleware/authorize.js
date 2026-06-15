const AppError = require("../../shared/errors/AppError");
const { AUTH_ERRORS } = require("../../modules/auth/constants");

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError("Authentication required", 401, {
        code: AUTH_ERRORS.UNAUTHORIZED,
      })
    );
  }

  if (!allowedRoles.includes(req.user.role)) {
    console.warn(`[AUTH DEBUG] Authorization failed. req.user:`, req.user, `allowedRoles:`, allowedRoles);
    return next(
      new AppError("Insufficient permissions", 403, {
        code: AUTH_ERRORS.FORBIDDEN,
      })
    );
  }

  return next();
};

module.exports = authorize;
