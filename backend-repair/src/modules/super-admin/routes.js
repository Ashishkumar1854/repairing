const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const { ROLES } = require("../auth/constants");
const superAdminController = require("./controller");
const { businessIdParam, contactCreateBody, subscriptionUpdateBody } = require("./validation");

const router = express.Router();

// Public route to submit contact inquiries
router.post("/contacts", validate(contactCreateBody), superAdminController.createContactRequest);

// Protected routes requiring Super Admin privileges
router.use(authenticate, authorize(ROLES.SUPER_ADMIN));
router.get("/businesses", superAdminController.listBusinesses);
router.get("/businesses/:id", validate(businessIdParam), superAdminController.getBusiness);
router.patch("/businesses/:id/suspend", validate(businessIdParam), superAdminController.suspendBusiness);
router.patch("/businesses/:id/activate", validate(businessIdParam), superAdminController.activateBusiness);
router.patch(
  "/businesses/:id/subscription",
  validate(subscriptionUpdateBody),
  superAdminController.updateBusinessSubscription
);
router.get("/contacts", superAdminController.listContactRequests);

module.exports = router;
