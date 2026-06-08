const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");
const inventoryService = require("./service");

const createInventoryItem = asyncHandler(async (req, res) => {
  const result = await inventoryService.createInventoryItem(req.user, req.validatedData.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Inventory item created successfully",
    data: result,
  });
});

const listInventoryItems = asyncHandler(async (req, res) => {
  const result = await inventoryService.listInventoryItems(req.user, req.validatedData.query);

  return sendSuccess(res, {
    message: "Inventory items retrieved successfully",
    data: {
      items: result.items,
    },
    meta: {
      pagination: result.pagination,
    },
  });
});

const getInventoryItem = asyncHandler(async (req, res) => {
  const result = await inventoryService.getInventoryItem(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Inventory item retrieved successfully",
    data: result,
  });
});

const updateInventoryItem = asyncHandler(async (req, res) => {
  const result = await inventoryService.updateInventoryItem(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Inventory item updated successfully",
    data: result,
  });
});

const consumeParts = asyncHandler(async (req, res) => {
  const result = await inventoryService.consumeParts(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Repair parts consumed successfully",
    data: result,
  });
});

const getTicketPartsUsage = asyncHandler(async (req, res) => {
  const result = await inventoryService.getTicketPartsUsage(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Repair parts usage retrieved successfully",
    data: result,
  });
});

module.exports = {
  createInventoryItem,
  listInventoryItems,
  getInventoryItem,
  updateInventoryItem,
  consumeParts,
  getTicketPartsUsage,
};
