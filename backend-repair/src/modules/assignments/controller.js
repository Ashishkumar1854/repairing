const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");
const assignmentService = require("./service");

const assignTechnician = asyncHandler(async (req, res) => {
  const result = await assignmentService.assignTechnician(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Technician assigned successfully",
    data: result,
  });
});

const reassignTechnician = asyncHandler(async (req, res) => {
  const result = await assignmentService.reassignTechnician(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Technician reassigned successfully",
    data: result,
  });
});

const getAssignmentHistory = asyncHandler(async (req, res) => {
  const result = await assignmentService.getAssignmentHistory(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Assignment history retrieved successfully",
    data: result,
  });
});

const getMyQueue = asyncHandler(async (req, res) => {
  const result = await assignmentService.getMyQueue(req.user, req.validatedData.query);

  return sendSuccess(res, {
    message: "Technician queue retrieved successfully",
    data: {
      assignments: result.assignments,
    },
    meta: {
      pagination: result.pagination,
    },
  });
});

const getMyDashboard = asyncHandler(async (req, res) => {
  const result = await assignmentService.getMyDashboard(req.user);

  return sendSuccess(res, {
    message: "Technician dashboard retrieved successfully",
    data: result,
  });
});

module.exports = {
  assignTechnician,
  reassignTechnician,
  getAssignmentHistory,
  getMyQueue,
  getMyDashboard,
};
