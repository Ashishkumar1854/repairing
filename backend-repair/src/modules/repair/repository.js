const prisma = require("../../core/database/prisma");

const statusActivityMap = {
  IN_REPAIR: "REPAIR_STARTED",
  WAITING_PARTS: "REPAIR_PAUSED",
  READY_FOR_REVIEW: "REPAIR_COMPLETED",
  READY_FOR_DELIVERY: "REPAIR_COMPLETED",
};

const customerSelect = {
  id: true,
  businessId: true,
  branchId: true,
  fullName: true,
  email: true,
  phone: true,
  address: true,
  createdAt: true,
  updatedAt: true,
};

const statusLogSelect = {
  id: true,
  fromStatus: true,
  toStatus: true,
  reason: true,
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

const estimateSummarySelect = {
  id: true,
  repairTicketId: true,
  estimateNumber: true,
  status: true,
  subtotalAmount: true,
  laborAmount: true,
  partsAmount: true,
  discountAmount: true,
  taxAmount: true,
  totalAmount: true,
  approvedAt: true,
  rejectedAt: true,
  createdAt: true,
  updatedAt: true,
};

const withLatestEstimate = (ticket) => {
  if (!ticket) {
    return ticket;
  }

  const latestEstimate = ticket.estimates?.[0] || null;

  return {
    ...ticket,
    latestEstimate,
  };
};

const ticketSelect = {
  id: true,
  businessId: true,
  branchId: true,
  ticketNumber: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  paymentStatus: true,
  receivedAt: true,
  dueAt: true,
  closedAt: true,
  laborCost: true,
  partsCost: true,
  vendorCost: true,
  totalRepairCost: true,
  finalInvoiceAmount: true,
  profitEstimate: true,
  diagnosis: true,
  repairNotes: true,
  workPerformed: true,
  estimatedCompletionTime: true,
  repairRemarks: true,
  internalNotes: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: customerSelect,
  },
  vendor: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
  items: {
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      itemType: true,
      brand: true,
      model: true,
      serialNumber: true,
      imei: true,
      condition: true,
      accessories: true,
      lockPin: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  issues: {
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      isConfirmed: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  statusLogs: {
    orderBy: {
      createdAt: "desc",
    },
    select: statusLogSelect,
  },
  estimates: {
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: estimateSummarySelect,
  },
};

const listTicketSelect = {
  id: true,
  branchId: true,
  ticketNumber: true,
  title: true,
  status: true,
  priority: true,
  paymentStatus: true,
  receivedAt: true,
  dueAt: true,
  closedAt: true,
  laborCost: true,
  partsCost: true,
  vendorCost: true,
  totalRepairCost: true,
  finalInvoiceAmount: true,
  profitEstimate: true,
  diagnosis: true,
  estimatedCompletionTime: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: customerSelect,
  },
  _count: {
    select: {
      items: true,
      issues: true,
      statusLogs: true,
    },
  },
  estimates: {
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: estimateSummarySelect,
  },
  assignments: {
    where: {
      deletedAt: null,
      status: "ASSIGNED",
    },
    select: {
      id: true,
      assignedToStaffId: true,
      assignedTo: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  },
};

const buildTicketWhere = ({ businessId, branchFilter, status, priority, customerId, search }) => {
  const where = {
    businessId,
    deletedAt: null,
  };

  if (branchFilter?.branchId) {
    where.branchId = branchFilter.branchId;
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { customer: { fullName: { contains: search, mode: "insensitive" } } },
      { customer: { phone: { contains: search, mode: "insensitive" } } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
};

const findCustomerById = (client, businessId, branchId, customerId) =>
  client.customer.findFirst({
    where: {
      id: customerId,
      businessId,
      branchId,
      deletedAt: null,
    },
    select: customerSelect,
  });

const upsertCustomerByPhone = (client, businessId, branchId, customer) =>
  client.customer.upsert({
    where: {
      businessId_branchId_phone: {
        businessId,
        branchId,
        phone: customer.phone,
      },
    },
    update: {
      fullName: customer.fullName,
      email: customer.email,
      address: customer.address,
      metadata: customer.metadata,
    },
    create: {
      businessId,
      branchId,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      metadata: customer.metadata,
    },
    select: customerSelect,
  });

const createTicketRecord = (client, data) =>
  client.repairTicket.create({
    data: {
      businessId: data.businessId,
      branchId: data.branchId,
      customerId: data.customerId,
      ticketNumber: data.ticketNumber,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueAt: data.dueAt,
      metadata: data.metadata,
      items: {
        create: data.items.map((item) => ({
          businessId: data.businessId,
          itemType: item.itemType,
          brand: item.brand,
          model: item.model,
          serialNumber: item.serialNumber,
          imei: item.imei,
          condition: item.condition,
          accessories: item.accessories,
          lockPin: item.lockPin,
          metadata: item.metadata,
        })),
      },
      issues: {
        create: data.issues.map((issue) => ({
          businessId: data.businessId,
          title: issue.title,
          description: issue.description,
          isConfirmed: issue.isConfirmed ?? false,
        })),
      },
      statusLogs: {
        create: {
          businessId: data.businessId,
          actorStaffId: data.actorStaffId,
          fromStatus: null,
          toStatus: "RECEIVED",
          reason: "Repair ticket created",
          metadata: {
            source: "repair_intake",
          },
        },
      },
    },
    select: ticketSelect,
  });

const createTicketIntake = (businessId, actorStaffId, data) =>
  prisma.$transaction(async (tx) => {
    const customer = data.customer.id
      ? await findCustomerById(tx, businessId, data.branchId, data.customer.id)
      : await upsertCustomerByPhone(tx, businessId, data.branchId, data.customer);

    if (!customer) {
      return null;
    }

    return createTicketRecord(tx, {
      businessId,
      branchId: data.branchId,
      actorStaffId,
      customerId: customer.id,
      ticketNumber: data.ticketNumber,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueAt: data.dueAt,
      items: data.items,
      issues: data.issues,
      metadata: data.metadata,
    });
  });

const listTickets = async ({ businessId, branchFilter, page, limit, status, priority, customerId, search }) => {
  const where = buildTicketWhere({ businessId, branchFilter, status, priority, customerId, search });
  const skip = (page - 1) * limit;

  const [total, tickets] = await prisma.$transaction([
    prisma.repairTicket.count({ where }),
    prisma.repairTicket.findMany({
      where,
      select: listTicketSelect,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
  ]);

  return {
    tickets: tickets.map(withLatestEstimate),
    total,
  };
};

const findTicketById = async (businessId, ticketId, branchFilter = {}) => {
  const ticket = await prisma.repairTicket.findFirst({
    where: {
      id: ticketId,
      businessId,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      deletedAt: null,
    },
    select: ticketSelect,
  });

  return withLatestEstimate(ticket);
};

const transitionTicketStatus = ({
  businessId,
  ticketId,
  actorStaffId,
  fromStatus,
  toStatus,
  reason,
  metadata,
  closedAt,
  branchId,
}) =>
  prisma.$transaction(async (tx) => {
    const updateResult = await tx.repairTicket.updateMany({
      where: {
        id: ticketId,
        businessId,
        branchId,
        status: fromStatus,
        deletedAt: null,
      },
      data: {
        status: toStatus,
        closedAt,
      },
    });

    if (updateResult.count !== 1) {
      return null;
    }

    await tx.repairStatusLog.create({
      data: {
        businessId,
        repairTicketId: ticketId,
        actorStaffId,
        fromStatus,
        toStatus,
        reason,
        metadata,
      },
    });

    if (statusActivityMap[toStatus] && actorStaffId) {
      await tx.repairTechnicianActivityLog.create({
        data: {
          businessId,
          branchId,
          repairTicketId: ticketId,
          technicianId: actorStaffId,
          actorStaffId,
          type: statusActivityMap[toStatus],
          notes: reason,
          metadata,
        },
      });
    }

    const ticket = await tx.repairTicket.findFirst({
      where: {
        id: ticketId,
        businessId,
        branchId,
      },
      select: ticketSelect,
    });

    return withLatestEstimate(ticket);
  });

const toNumber = (value) => Number(value || 0);
const toDecimalString = (value) => Number(value || 0).toFixed(2);

const updateTicketExecution = ({ businessId, ticketId, branchId, data }) =>
  prisma.$transaction(async (tx) => {
    const ticket = await tx.repairTicket.findFirst({
      where: {
        id: ticketId,
        businessId,
        ...(branchId ? { branchId } : {}),
        deletedAt: null,
      },
      select: {
        id: true,
        laborCost: true,
        partsCost: true,
        vendorCost: true,
        finalInvoiceAmount: true,
      },
    });

    if (!ticket) {
      return null;
    }

    const laborCost = data.laborCost !== undefined ? toNumber(data.laborCost) : toNumber(ticket.laborCost);
    const partsCost = toNumber(ticket.partsCost);
    const vendorCost = toNumber(ticket.vendorCost);
    const finalInvoiceAmount = toNumber(ticket.finalInvoiceAmount);

    const totalRepairCost = laborCost + partsCost;
    const profitEstimate = finalInvoiceAmount - laborCost - partsCost - vendorCost;

    const updatedTicket = await tx.repairTicket.update({
      where: {
        id: ticketId,
      },
      data: {
        diagnosis: data.diagnosis,
        repairNotes: data.repairNotes,
        workPerformed: data.workPerformed,
        laborCost: toDecimalString(laborCost),
        totalRepairCost: toDecimalString(totalRepairCost),
        profitEstimate: toDecimalString(profitEstimate),
        estimatedCompletionTime: data.estimatedCompletionTime ? new Date(data.estimatedCompletionTime) : null,
        repairRemarks: data.repairRemarks,
        internalNotes: data.internalNotes,
      },
      select: ticketSelect,
    });

    return withLatestEstimate(updatedTicket);
  });

module.exports = {
  createTicketIntake,
  listTickets,
  findTicketById,
  transitionTicketStatus,
  updateTicketExecution,
};
