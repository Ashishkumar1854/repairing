const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const { ROLES } = require("../auth/constants");
const customerController = require("./controller");
const { searchCustomersSchema, customerTicketsSchema } = require("./validation");

const router = express.Router();

const customerReadRoles = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.TECHNICIAN,
  ROLES.FRONT_DESK,
  ROLES.ACCOUNTANT,
];

router.use(authenticate);

router.get(
  "/search",
  authorize(...customerReadRoles),
  validate(searchCustomersSchema),
  customerController.searchCustomers
);

router.get(
  "/:id/tickets",
  authorize(...customerReadRoles),
  validate(customerTicketsSchema),
  customerController.getCustomerTickets
);

module.exports = router;
