const express = require("express");

const authenticate = require("../../../core/middleware/authenticate");
const authorize = require("../../../core/middleware/authorize");
const { ROLES } = require("../../auth/constants");
const subscriptionController = require("./controller");

const router = express.Router();

router.use(authenticate, authorize(ROLES.OWNER));
router.get("/current", subscriptionController.current);

module.exports = router;
