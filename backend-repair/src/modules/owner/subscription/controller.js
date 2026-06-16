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

const requestPayment = asyncHandler(async (req, res) => {
  const result = await subscriptionService.requestPayment(req.user, req.validatedData.body);

  return sendSuccess(res, {
    message: "Subscription payment request created",
    data: result,
  });
});

const startTrial = asyncHandler(async (req, res) => {
  const result = await subscriptionService.startTrial(req.user);

  return sendSuccess(res, {
    message: "Starter trial started",
    data: result,
  });
});

module.exports = {
  current,
  startTrial,
  requestPayment,
};
