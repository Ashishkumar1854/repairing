const express = require("express");

const { sendSuccess } = require("../shared/helpers/apiResponse");
const analyticsRoutes = require("../modules/analytics/routes");
const branchRoutes = require("../modules/owner/branches/routes");
const businessRoutes = require("../modules/owner/business/routes");
const {
  repairAssignmentRoutes,
  technicianRoutes,
} = require("../modules/assignments/routes");
const authRoutes = require("../modules/auth/routes");
const {
  billingRoutes,
  customerBillingRoutes,
  repairBillingRoutes,
} = require("../modules/billing/routes");
const customerRoutes = require("../modules/customers/routes");
const handoverRoutes = require("../modules/handover/routes");
const inventoryRoutes = require("../modules/inventory/routes");
const repairRoutes = require("../modules/repair/routes");
const staffRoutes = require("../modules/staff/routes");
const subscriptionRoutes = require("../modules/owner/subscription/routes");
const superAdminRoutes = require("../modules/super-admin/routes");
const {
  repairVendorRoutes,
  vendorRoutes,
} = require("../modules/vendors/routes");

const router = express.Router();

router.get("/", (req, res) =>
  sendSuccess(res, {
    message: "backend-repair API",
    data: {
      version: "v1",
      status: "ready",
    },
  })
);

router.use("/auth", authRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/branches", branchRoutes);
router.use("/business", businessRoutes);
router.use("/customers", customerRoutes);
router.use("/customers", customerBillingRoutes);
router.use("/repair", handoverRoutes);
router.use("/handover", handoverRoutes);
router.use("/repair", repairAssignmentRoutes);
router.use("/repair", repairBillingRoutes);
router.use("/repair", repairVendorRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/billing", billingRoutes);
router.use("/staff", staffRoutes);
router.use("/subscription", subscriptionRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/technicians", technicianRoutes);
router.use("/vendors", vendorRoutes);
router.use("/repair", repairRoutes);

module.exports = router;
