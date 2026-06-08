const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const vendorController = require("./controller");
const { VENDOR_PERMISSIONS } = require("./constants");
const {
  createVendorSchema,
  dispatchVendorRepairSchema,
  getVendorRepairJobSchema,
  getVendorSchema,
  listVendorRepairJobsSchema,
  listVendorsSchema,
  receiveVendorRepairSchema,
  recordVendorRepairCostSchema,
  updateVendorRepairStatusSchema,
  updateVendorSchema,
} = require("./validation");

const repairRouter = express.Router();
const vendorRouter = express.Router();

repairRouter.post(
  "/tickets/:id/vendor-dispatch",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.DISPATCH_REPAIR),
  validate(dispatchVendorRepairSchema),
  vendorController.dispatchVendorRepair
);

vendorRouter.get(
  "/repair-jobs",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.VIEW_VENDORS),
  validate(listVendorRepairJobsSchema),
  vendorController.listVendorRepairJobs
);

vendorRouter.get(
  "/repair-jobs/:id",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.VIEW_VENDORS),
  validate(getVendorRepairJobSchema),
  vendorController.getVendorRepairJob
);

vendorRouter.patch(
  "/repair-jobs/:id/status",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.UPDATE_VENDOR_JOB),
  validate(updateVendorRepairStatusSchema),
  vendorController.updateVendorRepairStatus
);

vendorRouter.post(
  "/repair-jobs/:id/receive",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.UPDATE_VENDOR_JOB),
  validate(receiveVendorRepairSchema),
  vendorController.receiveVendorRepair
);

vendorRouter.post(
  "/repair-jobs/:id/costs",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.MANAGE_VENDOR_COSTS),
  validate(recordVendorRepairCostSchema),
  vendorController.recordVendorRepairCost
);

vendorRouter.post(
  "/",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.MANAGE_VENDORS),
  validate(createVendorSchema),
  vendorController.createVendor
);

vendorRouter.get(
  "/",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.VIEW_VENDORS),
  validate(listVendorsSchema),
  vendorController.listVendors
);

vendorRouter.get(
  "/:id",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.VIEW_VENDORS),
  validate(getVendorSchema),
  vendorController.getVendor
);

vendorRouter.patch(
  "/:id",
  authenticate,
  authorize(...VENDOR_PERMISSIONS.MANAGE_VENDORS),
  validate(updateVendorSchema),
  vendorController.updateVendor
);

module.exports = {
  repairVendorRoutes: repairRouter,
  vendorRoutes: vendorRouter,
};
