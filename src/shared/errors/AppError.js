class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = options.code;
    this.errors = options.errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
