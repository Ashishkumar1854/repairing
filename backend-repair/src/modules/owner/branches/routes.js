const express = require("express");

const authenticate = require("../../../core/middleware/authenticate");
const authorize = require("../../../core/middleware/authorize");
const validate = require("../../../core/middleware/validate");
const { ROLES } = require("../../auth/constants");
const branchController = require("./controller");
const {
  branchIdParam,
  createBranchSchema,
  updateBranchSchema,
} = require("./validation");

const router = express.Router();

router.use(authenticate);
router.get("/", authorize(ROLES.OWNER), branchController.list);
router.get("/:id", authorize(ROLES.OWNER), validate(branchIdParam), branchController.getById);
router.post("/", authorize(ROLES.OWNER), validate(createBranchSchema), branchController.create);
router.patch("/:id", authorize(ROLES.OWNER), validate(updateBranchSchema), branchController.update);
router.post("/:id/activate", authorize(ROLES.OWNER), validate(branchIdParam), branchController.activate);
router.post("/:id/deactivate", authorize(ROLES.OWNER), validate(branchIdParam), branchController.deactivate);
router.delete("/:id", authorize(ROLES.OWNER), validate(branchIdParam), branchController.deleteBranch);

module.exports = router;
