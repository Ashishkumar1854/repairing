const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");
const analyticsService = require("./service");

const makeHandler = (serviceMethod, message) =>
  asyncHandler(async (req, res) => {
    const result = await serviceMethod(req.user, req.validatedData.query);

    return sendSuccess(res, {
      message,
      data: result,
    });
  });

module.exports = {
  getOwnerDashboard: makeHandler(
    analyticsService.getOwnerDashboard,
    "Owner dashboard analytics retrieved successfully"
  ),
  getRepairSummary: makeHandler(
    analyticsService.getRepairSummary,
    "Repair analytics summary retrieved successfully"
  ),
  getRepairStatusBreakdown: makeHandler(
    analyticsService.getRepairStatusBreakdown,
    "Repair status breakdown retrieved successfully"
  ),
  getFinanceRevenue: makeHandler(
    analyticsService.getFinanceRevenue,
    "Revenue analytics retrieved successfully"
  ),
  getFinanceDues: makeHandler(
    analyticsService.getFinanceDues,
    "Dues analytics retrieved successfully"
  ),
  getFinancePayments: makeHandler(
    analyticsService.getFinancePayments,
    "Payment analytics retrieved successfully"
  ),
  getProfitability: makeHandler(
    analyticsService.getProfitability,
    "Profitability analytics retrieved successfully"
  ),
  getTechnicianPerformance: makeHandler(
    analyticsService.getTechnicianPerformance,
    "Technician performance analytics retrieved successfully"
  ),
  getTechnicianWorkload: makeHandler(
    analyticsService.getTechnicianWorkload,
    "Technician workload analytics retrieved successfully"
  ),
  getInventoryUsage: makeHandler(
    analyticsService.getInventoryUsage,
    "Inventory usage analytics retrieved successfully"
  ),
  getInventoryVariance: makeHandler(
    analyticsService.getInventoryVariance,
    "Inventory variance analytics retrieved successfully"
  ),
  getSlaAnalytics: makeHandler(
    analyticsService.getSlaAnalytics,
    "SLA analytics retrieved successfully"
  ),
  getCustomerAnalytics: makeHandler(
    analyticsService.getCustomerAnalytics,
    "Customer analytics retrieved successfully"
  ),
};
