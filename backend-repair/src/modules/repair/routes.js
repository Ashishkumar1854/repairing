const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const inventoryController = require("../inventory/controller");
const repairController = require("./controller");
const estimateRoutes = require("./estimates/routes");
const {
  consumePartsSchema,
  partsUsageHistorySchema,
} = require("../inventory/validation");
const { INVENTORY_PERMISSIONS } = require("../inventory/constants");
const {
  createTicketSchema,
  listTicketsSchema,
  getTicketSchema,
  updateTicketStatusSchema,
  updateTicketExecutionSchema,
} = require("./validation");
const { REPAIR_PERMISSIONS } = require("./constants");

const router = express.Router();

router.use(estimateRoutes);

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

router.post(
  "/tickets/:id/consume-parts",
  authorize(...INVENTORY_PERMISSIONS.CONSUME_PARTS),
  validate(consumePartsSchema),
  inventoryController.consumeParts
);

router.get(
  "/tickets/:id/parts-usage",
  authorize(...REPAIR_PERMISSIONS.VIEW_TICKETS),
  validate(partsUsageHistorySchema),
  inventoryController.getTicketPartsUsage
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

router.patch(
  "/tickets/:id/execution",
  authorize(...REPAIR_PERMISSIONS.UPDATE_EXECUTION),
  validate(updateTicketExecutionSchema),
  repairController.updateTicketExecution
);

module.exports = router;
