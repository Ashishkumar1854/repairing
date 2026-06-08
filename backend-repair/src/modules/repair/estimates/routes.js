const express = require("express");

const authenticate = require("../../../core/middleware/authenticate");
const authorize = require("../../../core/middleware/authorize");
const validate = require("../../../core/middleware/validate");
const estimatesController = require("./controller");
const {
  createEstimateSchema,
  getEstimateSchema,
  approvalActionSchema,
} = require("./validation");
const { ESTIMATE_PERMISSIONS } = require("./constants");

const router = express.Router();

router.use(authenticate);

router.post(
  "/tickets/:id/estimate",
  authorize(...ESTIMATE_PERMISSIONS.CREATE),
  validate(createEstimateSchema),
  estimatesController.createEstimate
);

router.get(
  "/estimates/:id",
  authorize(...ESTIMATE_PERMISSIONS.VIEW),
  validate(getEstimateSchema),
  estimatesController.getEstimate
);

router.post(
  "/estimates/:id/approve",
  authorize(...ESTIMATE_PERMISSIONS.APPROVE),
  validate(approvalActionSchema),
  estimatesController.approveEstimate
);

router.post(
  "/estimates/:id/reject",
  authorize(...ESTIMATE_PERMISSIONS.REJECT),
  validate(approvalActionSchema),
  estimatesController.rejectEstimate
);

module.exports = router;
