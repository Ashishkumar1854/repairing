const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const inventoryController = require("./controller");
const {
  createInventoryItemSchema,
  listInventoryItemsSchema,
  getInventoryItemSchema,
  updateInventoryItemSchema,
} = require("./validation");
const { INVENTORY_PERMISSIONS } = require("./constants");

const router = express.Router();

router.use(authenticate);

router.post(
  "/items",
  authorize(...INVENTORY_PERMISSIONS.CREATE_ITEM),
  validate(createInventoryItemSchema),
  inventoryController.createInventoryItem
);

router.get(
  "/items",
  authorize(...INVENTORY_PERMISSIONS.VIEW_ITEM),
  validate(listInventoryItemsSchema),
  inventoryController.listInventoryItems
);

router.get(
  "/items/:id",
  authorize(...INVENTORY_PERMISSIONS.VIEW_ITEM),
  validate(getInventoryItemSchema),
  inventoryController.getInventoryItem
);

router.patch(
  "/items/:id",
  authorize(...INVENTORY_PERMISSIONS.UPDATE_ITEM),
  validate(updateInventoryItemSchema),
  inventoryController.updateInventoryItem
);

module.exports = router;
