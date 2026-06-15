const prisma = require("../../core/database/prisma");

const inventoryItemSelect = {
  id: true,
  businessId: true,
  branchId: true,
  vendorId: true,
  sku: true,
  partName: true,
  category: true,
  stockQuantity: true,
  reservedQuantity: true,
  unitCost: true,
  sellingPrice: true,
  reorderLevel: true,
  barcode: true,
  isActive: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  vendor: {
    select: {
      id: true,
      name: true,
    },
  },
};

const movementSelect = {
  id: true,
  branchId: true,
  type: true,
  quantityBefore: true,
  quantityChanged: true,
  quantityAfter: true,
  unitCost: true,
  notes: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      fullName: true,
      role: true,
    },
  },
};

const partsUsageSelect = {
  id: true,
  branchId: true,
  repairTicketId: true,
  inventoryItemId: true,
  partName: true,
  partSku: true,
  quantity: true,
  unitCost: true,
  totalCost: true,
  source: true,
  notes: true,
  usedAt: true,
  metadata: true,
  technician: {
    select: {
      id: true,
      fullName: true,
      role: true,
    },
  },
  inventoryItem: {
    select: {
      id: true,
      sku: true,
      partName: true,
      category: true,
    },
  },
};

const toNumber = (value) => Number(value || 0);
const toDecimalString = (value) => Number(value || 0).toFixed(2);

const createInventoryItem = ({ businessId, branchId, actorStaffId, data }) =>
  prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        businessId,
        branchId,
        vendorId: data.vendorId,
        sku: data.sku,
        partName: data.partName,
        category: data.category,
        stockQuantity: toDecimalString(data.stockQuantity),
        reservedQuantity: toDecimalString(data.reservedQuantity),
        unitCost: toDecimalString(data.unitCost),
        sellingPrice:
          data.sellingPrice === undefined ? undefined : toDecimalString(data.sellingPrice),
        reorderLevel: toDecimalString(data.reorderLevel),
        barcode: data.barcode,
        metadata: data.metadata,
      },
      select: inventoryItemSelect,
    });

    if (toNumber(data.stockQuantity) > 0) {
      await tx.inventoryStockMovement.create({
        data: {
          businessId,
          branchId,
          inventoryItemId: item.id,
          actorStaffId,
          type: "STOCK_IN",
          quantityBefore: "0.00",
          quantityChanged: toDecimalString(data.stockQuantity),
          quantityAfter: toDecimalString(data.stockQuantity),
          unitCost: toDecimalString(data.unitCost),
          notes: data.notes || "Initial stock",
          metadata: {
            source: "inventory_item_creation",
          },
        },
      });
    }

    return item;
  });

const buildInventoryWhere = ({ businessId, branchFilter = {}, search, category, isActive }) => {
  const where = {
    businessId,
    ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
    deletedAt: null,
  };

  if (category) {
    where.category = {
      equals: category,
      mode: "insensitive",
    };
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { partName: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
};

const listInventoryItems = async ({
  businessId,
  branchFilter,
  page,
  limit,
  search,
  category,
  isActive,
  lowStockOnly,
}) => {
  const where = buildInventoryWhere({ businessId, branchFilter, search, category, isActive });
  const skip = (page - 1) * limit;

  if (lowStockOnly) {
    const allItems = await prisma.inventoryItem.findMany({
      where,
      select: inventoryItemSelect,
      orderBy: {
        updatedAt: "desc",
      },
    });

    const lowStockItems = allItems.filter(
      (item) => Number(item.stockQuantity) <= Number(item.reorderLevel)
    );

    return {
      items: lowStockItems.slice(skip, skip + limit),
      total: lowStockItems.length,
    };
  }

  const [total, items] = await prisma.$transaction([
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({
      where,
      select: inventoryItemSelect,
      orderBy: {
        updatedAt: "desc",
      },
      skip,
      take: limit,
    }),
  ]);

  return {
    items,
    total,
  };
};

const findInventoryItemById = (businessId, itemId, branchFilter = {}) =>
  prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      businessId,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      deletedAt: null,
    },
    select: {
      ...inventoryItemSelect,
      movements: {
        orderBy: {
          createdAt: "desc",
        },
        take: 25,
        select: movementSelect,
      },
    },
  });

const findTicketForConsumption = (businessId, ticketId, branchFilter = {}) =>
  prisma.repairTicket.findFirst({
    where: {
      id: ticketId,
      businessId,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      deletedAt: null,
    },
    select: {
      id: true,
      branchId: true,
      status: true,
      ticketNumber: true,
    },
  });

const updateInventoryItem = ({ businessId, branchFilter = {}, itemId, actorStaffId, data }) =>
  prisma.$transaction(async (tx) => {
    const current = await tx.inventoryItem.findFirst({
      where: {
        id: itemId,
        businessId,
        ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
        deletedAt: null,
      },
      select: inventoryItemSelect,
    });

    if (!current) {
      return null;
    }

    const nextStock =
      data.stockQuantity === undefined ? undefined : toDecimalString(data.stockQuantity);

    const updated = await tx.inventoryItem.update({
      where: {
        id: itemId,
      },
      data: {
        partName: data.partName,
        category: data.category,
        vendorId: data.vendorId,
        unitCost: data.unitCost === undefined ? undefined : toDecimalString(data.unitCost),
        sellingPrice:
          data.sellingPrice === undefined
            ? undefined
            : data.sellingPrice === null
              ? null
              : toDecimalString(data.sellingPrice),
        reorderLevel:
          data.reorderLevel === undefined ? undefined : toDecimalString(data.reorderLevel),
        barcode: data.barcode,
        isActive: data.isActive,
        stockQuantity: nextStock,
        metadata: data.metadata,
      },
      select: inventoryItemSelect,
    });

    if (nextStock !== undefined) {
      const before = toNumber(current.stockQuantity);
      const after = toNumber(data.stockQuantity);
      const changed = after - before;

      if (changed !== 0) {
        await tx.inventoryStockMovement.create({
          data: {
            businessId,
            branchId: current.branchId,
            inventoryItemId: itemId,
            actorStaffId,
            type: "ADJUSTMENT",
            quantityBefore: toDecimalString(before),
            quantityChanged: toDecimalString(changed),
            quantityAfter: toDecimalString(after),
            unitCost: updated.unitCost,
            notes: data.notes,
            metadata: {
              source: "inventory_item_update",
            },
          },
        });
      }
    }

    return updated;
  });

const consumePartsForTicket = ({ businessId, branchFilter = {}, ticketId, actorStaffId, parts, technicianNotes, moveToInRepair, metadata }) =>
  prisma.$transaction(async (tx) => {
    const ticket = await tx.repairTicket.findFirst({
      where: {
        id: ticketId,
        businessId,
        ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
        deletedAt: null,
      },
      select: {
        id: true,
        branchId: true,
        status: true,
      },
    });

    if (!ticket) {
      return { outcome: "TICKET_NOT_FOUND" };
    }

    let ticketStatus = ticket.status;

    if (moveToInRepair && ["APPROVED", "WAITING_PARTS"].includes(ticket.status)) {
      const updateTicketResult = await tx.repairTicket.updateMany({
        where: {
          id: ticketId,
          businessId,
          branchId: ticket.branchId,
          status: ticket.status,
          deletedAt: null,
        },
        data: {
          status: "IN_REPAIR",
        },
      });

      if (updateTicketResult.count !== 1) {
        return { outcome: "WORKFLOW_CONFLICT" };
      }

      await tx.repairStatusLog.create({
        data: {
          businessId,
          repairTicketId: ticketId,
          actorStaffId,
          fromStatus: ticket.status,
          toStatus: "IN_REPAIR",
          reason: "Parts consumption started repair work",
          metadata,
        },
      });

      ticketStatus = "IN_REPAIR";
    }

    const usageIds = [];

    for (const part of parts) {
      const item = await tx.inventoryItem.findFirst({
        where: {
          id: part.inventoryItemId,
          businessId,
          branchId: ticket.branchId,
          deletedAt: null,
        },
        select: {
          id: true,
          sku: true,
          partName: true,
          stockQuantity: true,
          unitCost: true,
          isActive: true,
        },
      });

      if (!item) {
        throw new Error("INVENTORY_ITEM_NOT_FOUND");
      }

      if (!item.isActive) {
        throw new Error("INVENTORY_ITEM_INACTIVE");
      }

      const before = toNumber(item.stockQuantity);
      const consumed = toNumber(part.quantity);
      const after = before - consumed;

      if (after < 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const updateStockResult = await tx.inventoryItem.updateMany({
        where: {
          id: item.id,
          businessId,
          branchId: ticket.branchId,
          deletedAt: null,
          isActive: true,
          stockQuantity: {
            gte: toDecimalString(consumed),
          },
        },
        data: {
          stockQuantity: toDecimalString(after),
        },
      });

      if (updateStockResult.count !== 1) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const totalCost = consumed * toNumber(item.unitCost);

      const usage = await tx.repairPartsUsage.create({
        data: {
          businessId,
          branchId: ticket.branchId,
          repairTicketId: ticketId,
          inventoryItemId: item.id,
          technicianId: actorStaffId,
          partName: item.partName,
          partSku: item.sku,
          quantity: toDecimalString(consumed),
          unitCost: item.unitCost,
          totalCost: toDecimalString(totalCost),
          source: "inventory",
          notes: part.notes,
          metadata: part.metadata,
        },
        select: {
          id: true,
        },
      });

      usageIds.push(usage.id);

      await tx.inventoryStockMovement.create({
        data: {
          businessId,
          branchId: ticket.branchId,
          inventoryItemId: item.id,
          repairTicketId: ticketId,
          actorStaffId,
          technicianId: actorStaffId,
          type: "CONSUMED",
          quantityBefore: toDecimalString(before),
          quantityChanged: toDecimalString(-consumed),
          quantityAfter: toDecimalString(after),
          unitCost: item.unitCost,
          notes: part.notes,
          metadata: {
            ...(part.metadata || {}),
            repairPartsUsageId: usage.id,
          },
        },
      });
    }

    // Update ticket partsCost and profitEstimate
    const allUsages = await tx.repairPartsUsage.findMany({
      where: {
        repairTicketId: ticketId,
        businessId,
        branchId: ticket.branchId,
        deletedAt: null,
      },
      select: {
        totalCost: true,
      },
    });

    const partsCostSum = allUsages.reduce((sum, u) => sum + toNumber(u.totalCost), 0);

    const currentTicketDetails = await tx.repairTicket.findFirst({
      where: {
        id: ticketId,
        businessId,
        branchId: ticket.branchId,
      },
      select: {
        laborCost: true,
        vendorCost: true,
        finalInvoiceAmount: true,
      },
    });

    const laborCost = toNumber(currentTicketDetails?.laborCost);
    const vendorCost = toNumber(currentTicketDetails?.vendorCost);
    const finalInvoiceAmount = toNumber(currentTicketDetails?.finalInvoiceAmount);

    const totalRepairCost = laborCost + partsCostSum;
    const profitEstimate = finalInvoiceAmount - laborCost - partsCostSum - vendorCost;

    await tx.repairTicket.update({
      where: {
        id: ticketId,
      },
      data: {
        partsCost: toDecimalString(partsCostSum),
        totalRepairCost: toDecimalString(totalRepairCost),
        profitEstimate: toDecimalString(profitEstimate),
      },
    });

    if (technicianNotes.length > 0) {
      await tx.repairNote.createMany({
        data: technicianNotes.map((note) => ({
          businessId,
          repairTicketId: ticketId,
          createdById: actorStaffId,
          note: note.note,
          isInternal: note.isInternal,
          metadata: note.metadata,
        })),
      });
    }

    const usage = await tx.repairPartsUsage.findMany({
      where: {
        id: {
          in: usageIds,
        },
        businessId,
        branchId: ticket.branchId,
      },
      select: partsUsageSelect,
      orderBy: {
        usedAt: "desc",
      },
    });

    return {
      outcome: "CONSUMED",
      ticketStatus,
      usage,
    };
  });

const getTicketPartsUsage = (businessId, ticketId, branchFilter = {}) =>
  prisma.repairPartsUsage.findMany({
    where: {
      businessId,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      repairTicketId: ticketId,
      deletedAt: null,
    },
    select: partsUsageSelect,
    orderBy: {
      usedAt: "desc",
    },
  });

module.exports = {
  createInventoryItem,
  listInventoryItems,
  findInventoryItemById,
  findTicketForConsumption,
  updateInventoryItem,
  consumePartsForTicket,
  getTicketPartsUsage,
};
