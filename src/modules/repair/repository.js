const prisma = require("../../core/database/prisma");

const customerSelect = {
  id: true,
  businessId: true,
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

const ticketSelect = {
  id: true,
  businessId: true,
  ticketNumber: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  paymentStatus: true,
  receivedAt: true,
  dueAt: true,
  closedAt: true,
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
};

const listTicketSelect = {
  id: true,
  ticketNumber: true,
  title: true,
  status: true,
  priority: true,
  paymentStatus: true,
  receivedAt: true,
  dueAt: true,
  closedAt: true,
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
};

const buildTicketWhere = ({ businessId, status, priority, customerId, search }) => {
  const where = {
    businessId,
    deletedAt: null,
  };

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

const findCustomerById = (client, businessId, customerId) =>
  client.customer.findFirst({
    where: {
      id: customerId,
      businessId,
      deletedAt: null,
    },
    select: customerSelect,
  });

const upsertCustomerByPhone = (client, businessId, customer) =>
  client.customer.upsert({
    where: {
      businessId_phone: {
        businessId,
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
      ? await findCustomerById(tx, businessId, data.customer.id)
      : await upsertCustomerByPhone(tx, businessId, data.customer);

    if (!customer) {
      return null;
    }

    return createTicketRecord(tx, {
      businessId,
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

const listTickets = async ({ businessId, page, limit, status, priority, customerId, search }) => {
  const where = buildTicketWhere({ businessId, status, priority, customerId, search });
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
    tickets,
    total,
  };
};

const findTicketById = (businessId, ticketId) =>
  prisma.repairTicket.findFirst({
    where: {
      id: ticketId,
      businessId,
      deletedAt: null,
    },
    select: ticketSelect,
  });

const transitionTicketStatus = ({
  businessId,
  ticketId,
  actorStaffId,
  fromStatus,
  toStatus,
  reason,
  metadata,
  closedAt,
}) =>
  prisma.$transaction(async (tx) => {
    const updateResult = await tx.repairTicket.updateMany({
      where: {
        id: ticketId,
        businessId,
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

    return tx.repairTicket.findFirst({
      where: {
        id: ticketId,
        businessId,
      },
      select: ticketSelect,
    });
  });

module.exports = {
  createTicketIntake,
  listTickets,
  findTicketById,
  transitionTicketStatus,
};
