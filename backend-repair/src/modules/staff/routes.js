const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const { ROLES } = require("../auth/constants");
const staffController = require("./controller");
const {
  assignBranchSchema,
  createStaffSchema,
  resetTechnicianPasswordSchema,
  staffIdParam,
  listStaffSchema,
} = require("./validation");

const router = express.Router();

router.use(authenticate);
router.get("/", authorize(ROLES.OWNER, ROLES.ADMIN), validate(listStaffSchema), staffController.list);
router.post("/", authorize(ROLES.OWNER, ROLES.ADMIN), validate(createStaffSchema), staffController.createStaff);
router.post("/:id/disable", authorize(ROLES.OWNER, ROLES.ADMIN), validate(staffIdParam), staffController.disable);
router.post("/:id/enable", authorize(ROLES.OWNER, ROLES.ADMIN), validate(staffIdParam), staffController.enable);
router.post("/:id/reset-password", authorize(ROLES.OWNER, ROLES.ADMIN), validate(resetTechnicianPasswordSchema), staffController.resetPassword);
router.patch("/:id/branch", authorize(ROLES.OWNER), validate(assignBranchSchema), staffController.assignBranch);
router.delete("/:id", authorize(ROLES.OWNER, ROLES.ADMIN), validate(staffIdParam), staffController.deleteStaff);

module.exports = router;
