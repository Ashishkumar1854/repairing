const prisma = require("../../core/database/prisma");

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
  _count: {
    select: {
      tickets: true,
    },
  },
};

const searchCustomers = ({ businessId, branchFilter = {}, query, limit }) =>
  prisma.customer.findMany({
    where: {
      businessId,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      deletedAt: null,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    },
    select: customerSelect,
    orderBy: {
      updatedAt: "desc",
    },
    take: limit,
  });

const findCustomerById = (businessId, customerId, branchFilter = {}) =>
  prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      deletedAt: null,
    },
    select: customerSelect,
  });

const getCustomerTickets = async ({ businessId, branchFilter = {}, customerId, page, limit }) => {
  const where = {
    businessId,
    ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
    customerId,
    deletedAt: null,
  };
  const skip = (page - 1) * limit;

  const [total, tickets] = await prisma.$transaction([
    prisma.repairTicket.count({ where }),
    prisma.repairTicket.findMany({
      where,
      select: {
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
        _count: {
          select: {
            items: true,
            issues: true,
            statusLogs: true,
          },
        },
      },
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

module.exports = {
  searchCustomers,
  findCustomerById,
  getCustomerTickets,
};
