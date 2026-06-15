const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const analyticsController = require("./controller");
const { ANALYTICS_PERMISSIONS } = require("./constants");
const { analyticsQuerySchema } = require("./validation");

const router = express.Router();

router.use(authenticate);

router.get(
  "/dashboard/owner",
  authorize(...ANALYTICS_PERMISSIONS.OWNER_DASHBOARD),
  validate(analyticsQuerySchema),
  analyticsController.getOwnerDashboard
);



router.get(
  "/repairs/summary",
  authorize(...ANALYTICS_PERMISSIONS.OPERATIONAL),
  validate(analyticsQuerySchema),
  analyticsController.getRepairSummary
);

router.get(
  "/repairs/status-breakdown",
  authorize(...ANALYTICS_PERMISSIONS.OPERATIONAL),
  validate(analyticsQuerySchema),
  analyticsController.getRepairStatusBreakdown
);

router.get(
  "/finance/revenue",
  authorize(...ANALYTICS_PERMISSIONS.FINANCIAL),
  validate(analyticsQuerySchema),
  analyticsController.getFinanceRevenue
);

router.get(
  "/finance/dues",
  authorize(...ANALYTICS_PERMISSIONS.FINANCIAL),
  validate(analyticsQuerySchema),
  analyticsController.getFinanceDues
);

router.get(
  "/finance/payments",
  authorize(...ANALYTICS_PERMISSIONS.FINANCIAL),
  validate(analyticsQuerySchema),
  analyticsController.getFinancePayments
);

router.get(
  "/profitability",
  authorize(...ANALYTICS_PERMISSIONS.PROFITABILITY),
  validate(analyticsQuerySchema),
  analyticsController.getProfitability
);

router.get(
  "/technicians/performance",
  authorize(...ANALYTICS_PERMISSIONS.TECHNICIAN),
  validate(analyticsQuerySchema),
  analyticsController.getTechnicianPerformance
);

router.get(
  "/technicians/workload",
  authorize(...ANALYTICS_PERMISSIONS.TECHNICIAN),
  validate(analyticsQuerySchema),
  analyticsController.getTechnicianWorkload
);

router.get(
  "/inventory/usage",
  authorize(...ANALYTICS_PERMISSIONS.INVENTORY),
  validate(analyticsQuerySchema),
  analyticsController.getInventoryUsage
);

router.get(
  "/inventory/variance",
  authorize(...ANALYTICS_PERMISSIONS.INVENTORY),
  validate(analyticsQuerySchema),
  analyticsController.getInventoryVariance
);

router.get(
  "/sla",
  authorize(...ANALYTICS_PERMISSIONS.SLA),
  validate(analyticsQuerySchema),
  analyticsController.getSlaAnalytics
);

router.get(
  "/customers",
  authorize(...ANALYTICS_PERMISSIONS.CUSTOMER),
  validate(analyticsQuerySchema),
  analyticsController.getCustomerAnalytics
);

module.exports = router;
