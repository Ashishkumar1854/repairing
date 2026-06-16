const express = require("express");

const authenticate = require("../../../core/middleware/authenticate");
const authorize = require("../../../core/middleware/authorize");
const validate = require("../../../core/middleware/validate");
const { ROLES } = require("../../auth/constants");
const subscriptionController = require("./controller");
const { subscriptionPaymentRequestBody } = require("./validation");

const router = express.Router();

router.use(authenticate, authorize(ROLES.OWNER));
router.get("/current", subscriptionController.current);
router.post("/start-trial", subscriptionController.startTrial);
router.post(
  "/payment-request",
  validate(subscriptionPaymentRequestBody),
  subscriptionController.requestPayment
);

module.exports = router;
