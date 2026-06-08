const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");
const handoverService = require("./service");

const createHandover = asyncHandler(async (req, res) => {
  const result = await handoverService.createHandover(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Handover recorded successfully",
    data: result,
  });
});

const getTicketHandovers = asyncHandler(async (req, res) => {
  const result = await handoverService.getTicketHandovers(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Handover history retrieved successfully",
    data: result,
  });
});

const getCurrentCustody = asyncHandler(async (req, res) => {
  const result = await handoverService.getCurrentCustody(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Current custody retrieved successfully",
    data: result,
  });
});

module.exports = {
  createHandover,
  getTicketHandovers,
  getCurrentCustody,
};
