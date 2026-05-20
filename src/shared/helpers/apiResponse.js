const sendSuccess = (res, options = {}) => {
  const {
    statusCode = 200,
    message = "Request completed successfully",
    data = null,
    meta,
  } = options;

  const payload = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

const sendError = (res, options = {}) => {
  const {
    statusCode = 500,
    message = "Internal server error",
    errors,
    code,
  } = options;

  const payload = {
    success: false,
    message,
  };

  if (code !== undefined) {
    payload.code = code;
  }

  if (errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError,
};
