const estimatesService = require("./service");
const asyncHandler = require("../../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../../shared/helpers/apiResponse");

const createEstimate = asyncHandler(async (req, res) => {
  const result = await estimatesService.createEstimate(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Repair estimate created",
    data: result,
  });
});

const getEstimate = asyncHandler(async (req, res) => {
  const result = await estimatesService.getEstimate(
    req.user,
    req.validatedData.params.id
  );

  return sendSuccess(res, {
    message: "Repair estimate retrieved",
    data: result,
  });
});

const approveEstimate = asyncHandler(async (req, res) => {
  const result = await estimatesService.approveEstimate(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Repair estimate approved",
    data: result,
  });
});

const rejectEstimate = asyncHandler(async (req, res) => {
  const result = await estimatesService.rejectEstimate(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Repair estimate rejected",
    data: result,
  });
});

module.exports = {
  createEstimate,
  getEstimate,
  approveEstimate,
  rejectEstimate,
};
