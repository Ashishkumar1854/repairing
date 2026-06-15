const AppError = require("../../shared/errors/AppError");
const {
  resolveBranchFilter,
  resolveBranchIdForWrite,
} = require("../../shared/utils/branchScope");
const assignmentService = require("../assignments/service");
const inventoryRepository = require("./repository");
const { INVENTORY_ERRORS } = require("./constants");
const { TICKET_STATUSES } = require("../repair/constants");
const { assertCanTransition } = require("../repair/workflow");

const mapRepositoryError = (error) => {
  if (error.message === "INVENTORY_ITEM_NOT_FOUND") {
    return new AppError("Inventory item not found", 404, {
      code: INVENTORY_ERRORS.ITEM_NOT_FOUND,
    });
  }

  if (error.message === "INVENTORY_ITEM_INACTIVE") {
    return new AppError("Inventory item is inactive", 409, {
      code: INVENTORY_ERRORS.ITEM_INACTIVE,
    });
  }

  if (error.message === "INSUFFICIENT_STOCK") {
    return new AppError("Insufficient inventory stock", 409, {
      code: INVENTORY_ERRORS.INSUFFICIENT_STOCK,
    });
  }

  return error;
};

const createInventoryItem = async (user, payload) => {
  try {
    const branchId = await resolveBranchIdForWrite(user, payload);
    const item = await inventoryRepository.createInventoryItem({
      businessId: user.businessId,
      branchId,
      actorStaffId: user.staffId,
      data: payload,
    });

    return {
      item,
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw new AppError("Inventory SKU already exists", 409, {
        code: INVENTORY_ERRORS.SKU_ALREADY_EXISTS,
      });
    }

    throw error;
  }
};

const listInventoryItems = async (user, query) => {
  const branchFilter = await resolveBranchFilter(user, query);
  const { items, total } = await inventoryRepository.listInventoryItems({
    businessId: user.businessId,
    branchFilter,
    page: query.page,
    limit: query.limit,
    search: query.search,
    category: query.category,
    isActive: query.isActive,
    lowStockOnly: query.lowStockOnly,
  });

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

const getInventoryItem = async (user, itemId) => {
  const branchFilter = await resolveBranchFilter(user);
  const item = await inventoryRepository.findInventoryItemById(user.businessId, itemId, branchFilter);

  if (!item) {
    throw new AppError("Inventory item not found", 404, {
      code: INVENTORY_ERRORS.ITEM_NOT_FOUND,
    });
  }

  return {
    item,
  };
};

const updateInventoryItem = async (user, itemId, payload) => {
  const branchFilter = await resolveBranchFilter(user, payload);
  const item = await inventoryRepository.updateInventoryItem({
    businessId: user.businessId,
    branchFilter,
    itemId,
    actorStaffId: user.staffId,
    data: payload,
  });

  if (!item) {
    throw new AppError("Inventory item not found", 404, {
      code: INVENTORY_ERRORS.ITEM_NOT_FOUND,
    });
  }

  return {
    item,
  };
};

const consumeParts = async (user, ticketId, payload) => {
  const branchFilter = await resolveBranchFilter(user, payload);
  const ticket = await inventoryRepository.findTicketForConsumption(user.businessId, ticketId, branchFilter);

  if (!ticket) {
    throw new AppError("Repair ticket not found", 404, {
      code: INVENTORY_ERRORS.TICKET_NOT_FOUND,
    });
  }

  await assignmentService.assertTicketOwnershipForTechnician(user, ticketId);

  assertConsumptionWorkflow(ticket.status);
  const shouldMoveToInRepair = ticket.status !== TICKET_STATUSES.IN_REPAIR;

  try {
    const result = await inventoryRepository.consumePartsForTicket({
      businessId: user.businessId,
      branchFilter,
      ticketId,
      actorStaffId: user.staffId,
      parts: payload.parts,
      technicianNotes: payload.technicianNotes || [],
      moveToInRepair: shouldMoveToInRepair,
      metadata: payload.metadata,
    });

    if (result.outcome === "TICKET_NOT_FOUND") {
      throw new AppError("Repair ticket not found", 404, {
        code: INVENTORY_ERRORS.TICKET_NOT_FOUND,
      });
    }

    if (result.outcome === "WORKFLOW_CONFLICT") {
      throw new AppError("Repair ticket workflow changed while consuming parts", 409, {
        code: INVENTORY_ERRORS.WORKFLOW_CONFLICT,
      });
    }

    return {
      ticketStatus: result.ticketStatus,
      usage: result.usage,
    };
  } catch (error) {
    throw mapRepositoryError(error);
  }
};

const getTicketPartsUsage = async (user, ticketId) => {
  const branchFilter = await resolveBranchFilter(user);
  const usage = await inventoryRepository.getTicketPartsUsage(user.businessId, ticketId, branchFilter);

  return {
    usage,
  };
};

const assertConsumptionWorkflow = (status) => {
  if (status === TICKET_STATUSES.APPROVED) {
    assertCanTransition(TICKET_STATUSES.APPROVED, TICKET_STATUSES.IN_REPAIR);
    return;
  }

  if (status === TICKET_STATUSES.IN_REPAIR) {
    return;
  }

  if (status === TICKET_STATUSES.WAITING_PARTS) {
    assertCanTransition(TICKET_STATUSES.WAITING_PARTS, TICKET_STATUSES.IN_REPAIR);
    return;
  }

  throw new AppError("Ticket is not ready for parts consumption", 409, {
    code: INVENTORY_ERRORS.INVALID_TICKET_STATUS,
    errors: {
      currentStatus: status,
      allowedStatuses: [
        TICKET_STATUSES.APPROVED,
        TICKET_STATUSES.IN_REPAIR,
        TICKET_STATUSES.WAITING_PARTS,
      ],
    },
  });
};

module.exports = {
  createInventoryItem,
  listInventoryItems,
  getInventoryItem,
  updateInventoryItem,
  consumeParts,
  getTicketPartsUsage,
  assertConsumptionWorkflow,
};
