const asyncHandler = require("../../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../../shared/helpers/apiResponse");
const businessService = require("./service");

const getProfile = asyncHandler(async (req, res) => {
  const result = await businessService.getProfile(req.user);

  return sendSuccess(res, {
    message: "Business profile",
    data: result,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await businessService.updateProfile(req.user, req.validatedData.body);

  return sendSuccess(res, {
    message: "Business profile updated",
    data: result,
  });
});

module.exports = {
  getProfile,
  updateProfile,
};
