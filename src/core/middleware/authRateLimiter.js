const rateLimit = require("express-rate-limit");

const env = require("../config/env");
const { sendError } = require("../../shared/helpers/apiResponse");
const { AUTH_ERRORS } = require("../../modules/auth/constants");

const loginRateLimiter = rateLimit({
  windowMs: env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    sendError(res, {
      statusCode: 429,
      message: "Too many login attempts. Please try again later.",
      code: AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
    }),
});

module.exports = {
  loginRateLimiter,
};
