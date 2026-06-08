const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const handoverController = require("./controller");
const { HANDOVER_PERMISSIONS } = require("./constants");
const { handoverSchema, ticketCustodySchema } = require("./validation");

const router = express.Router();

router.post(
  "/tickets/:id/handover",
  authenticate,
  authorize(...HANDOVER_PERMISSIONS.MANAGE_HANDOVERS),
  validate(handoverSchema),
  handoverController.createHandover
);

router.get(
  "/tickets/:id/handovers",
  authenticate,
  authorize(...HANDOVER_PERMISSIONS.VIEW_HANDOVERS),
  validate(ticketCustodySchema),
  handoverController.getTicketHandovers
);

router.get(
  "/tickets/:id/current-custody",
  authenticate,
  authorize(...HANDOVER_PERMISSIONS.VIEW_HANDOVERS),
  validate(ticketCustodySchema),
  handoverController.getCurrentCustody
);

module.exports = router;
