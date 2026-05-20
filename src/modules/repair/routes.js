const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const repairController = require("./controller");
const {
  createTicketSchema,
  listTicketsSchema,
  getTicketSchema,
  updateTicketStatusSchema,
} = require("./validation");
const { REPAIR_PERMISSIONS } = require("./constants");

const router = express.Router();

router.use(authenticate);

router.post(
  "/tickets",
  authorize(...REPAIR_PERMISSIONS.CREATE_TICKET),
  validate(createTicketSchema),
  repairController.createTicket
);

router.get(
  "/tickets",
  authorize(...REPAIR_PERMISSIONS.VIEW_TICKETS),
  validate(listTicketsSchema),
  repairController.listTickets
);

router.get(
  "/tickets/:id",
  authorize(...REPAIR_PERMISSIONS.VIEW_TICKETS),
  validate(getTicketSchema),
  repairController.getTicket
);

router.patch(
  "/tickets/:id/status",
  authorize(...REPAIR_PERMISSIONS.UPDATE_STATUS),
  validate(updateTicketStatusSchema),
  repairController.updateTicketStatus
);

module.exports = router;
