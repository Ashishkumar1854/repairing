const asyncHandler = require("../../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../../shared/helpers/apiResponse");
const subscriptionService = require("./service");

const current = asyncHandler(async (req, res) => {
  const result = await subscriptionService.current(req.user);

  return sendSuccess(res, {
    message: "Current subscription",
    data: result,
  });
});

module.exports = {
  current,
};
