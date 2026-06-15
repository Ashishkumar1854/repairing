const asyncHandler = require("../../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../../shared/helpers/apiResponse");
const branchService = require("./service");

const list = asyncHandler(async (req, res) => {
  const result = await branchService.list(req.user);
  return sendSuccess(res, {
    message: "Branch list",
    data: result,
  });
});

const create = asyncHandler(async (req, res) => {
  const result = await branchService.create(req.user, req.validatedData.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Branch created",
    data: result,
  });
});

const update = asyncHandler(async (req, res) => {
  const result = await branchService.update(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );
  return sendSuccess(res, {
    message: "Branch updated",
    data: result,
  });
});

const activate = asyncHandler(async (req, res) => {
  const result = await branchService.activate(req.user, req.validatedData.params.id);
  return sendSuccess(res, {
    message: "Branch activated",
    data: result,
  });
});

const deactivate = asyncHandler(async (req, res) => {
  const result = await branchService.deactivate(req.user, req.validatedData.params.id);
  return sendSuccess(res, {
    message: "Branch deactivated",
    data: result,
  });
});

const deleteBranch = asyncHandler(async (req, res) => {
  const result = await branchService.deleteBranch(req.user, req.validatedData.params.id);
  return sendSuccess(res, {
    message: "Branch deleted",
    data: result,
  });
});

const getById = asyncHandler(async (req, res) => {
  const result = await branchService.getById(req.user, req.validatedData.params.id);
  return sendSuccess(res, {
    message: "Branch detail",
    data: result,
  });
});

module.exports = {
  list,
  create,
  update,
  getById,
  activate,
  deactivate,
  deleteBranch,
};
