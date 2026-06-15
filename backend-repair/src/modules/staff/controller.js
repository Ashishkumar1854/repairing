const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");
const staffService = require("./service");

const list = asyncHandler(async (req, res) => {
  const result = await staffService.list(req.user, req.validatedData?.query);

  return sendSuccess(res, {
    message: "Managed staff list",
    data: result,
  });
});

const createStaff = asyncHandler(async (req, res) => {
  const result = await staffService.createStaff(req.user, req.validatedData.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Staff member created",
    data: result,
  });
});

const disable = asyncHandler(async (req, res) => {
  const result = await staffService.disable(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Staff member disabled",
    data: result,
  });
});

const enable = asyncHandler(async (req, res) => {
  const result = await staffService.enable(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Staff member enabled",
    data: result,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await staffService.resetPassword(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Staff member password reset",
    data: result,
  });
});

const assignBranch = asyncHandler(async (req, res) => {
  const result = await staffService.assignBranch(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Staff branch assignment updated",
    data: result,
  });
});

const deleteStaff = asyncHandler(async (req, res) => {
  const result = await staffService.deleteStaff(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Staff member deleted",
    data: result,
  });
});

module.exports = {
  list,
  createStaff,
  disable,
  enable,
  resetPassword,
  assignBranch,
  deleteStaff,
};
