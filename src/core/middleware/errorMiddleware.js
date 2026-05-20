const { ZodError } = require("zod");

const env = require("../config/env");
const logger = require("../logger/logger");
const AppError = require("../../shared/errors/AppError");
const { sendError } = require("../../shared/helpers/apiResponse");

const isProduction = env.NODE_ENV === "production";

const formatZodErrors = (error) =>
  error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  if (err instanceof ZodError) {
    error = new AppError("Validation failed", 400, {
      code: "VALIDATION_ERROR",
      errors: formatZodErrors(err),
    });
  }

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational === true;
  const message =
    isOperational || !isProduction ? error.message : "Internal server error";

  const logLevel = statusCode >= 500 ? "error" : "warn";

  logger[logLevel](
    {
      err,
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      ip: req.ip,
    },
    "Request failed"
  );

  return sendError(res, {
    statusCode,
    message,
    code: error.code,
    errors: isOperational || !isProduction ? error.errors : undefined,
  });
};

module.exports = errorMiddleware;
