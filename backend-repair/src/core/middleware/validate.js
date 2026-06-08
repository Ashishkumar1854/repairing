const { ZodError } = require("zod");

const AppError = require("../../shared/errors/AppError");

const formatZodErrors = (error) =>
  error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    req.validatedData = result;
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        new AppError("Validation failed", 400, {
          code: "VALIDATION_ERROR",
          errors: formatZodErrors(error),
        })
      );
    }

    return next(error);
  }
};

module.exports = validate;
