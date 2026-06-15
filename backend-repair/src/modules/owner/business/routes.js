const express = require("express");

const authenticate = require("../../../core/middleware/authenticate");
const authorize = require("../../../core/middleware/authorize");
const validate = require("../../../core/middleware/validate");
const { ROLES } = require("../../auth/constants");
const businessController = require("./controller");
const { updateBusinessProfileSchema } = require("./validation");

const router = express.Router();

router.use(authenticate);
router.get("/profile", authorize(ROLES.OWNER), businessController.getProfile);
router.patch(
  "/profile",
  authorize(ROLES.OWNER),
  validate(updateBusinessProfileSchema),
  businessController.updateProfile
);

module.exports = router;
