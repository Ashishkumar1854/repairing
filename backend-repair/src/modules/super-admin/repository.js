const prisma = require("../../core/database/prisma");

const ownerSelect = {
  fullName: true,
  email: true,
};

const businessListSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  staff: {
    where: {
      role: "OWNER",
      deletedAt: null,
    },
    take: 1,
    select: ownerSelect,
  },
  subscription: {
    select: {
      id: true,
      businessId: true,
      plan: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

const listBusinesses = () =>
  prisma.business.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: businessListSelect,
  });

const findBusiness = (businessId) =>
  prisma.business.findFirst({
    where: {
      id: businessId,
      deletedAt: null,
    },
    select: {
      ...businessListSelect,
      email: true,
      phone: true,
      website: true,
      city: true,
      state: true,
      country: true,
      address: true,
      gstNumber: true,
    },
  });

const updateStatus = (businessId, status) =>
  prisma.business.update({
    where: { id: businessId },
    data: { status },
    select: businessListSelect,
  });

const upsertSubscription = (businessId, data) =>
  prisma.subscription.upsert({
    where: { businessId },
    update: data,
    create: {
      businessId,
      ...data,
    },
    select: businessListSelect.subscription.select,
  });

const createContactRequest = (data) =>
  prisma.contactRequest.create({
    data: {
      name: data.name,
      phone: data.phone,
      shopName: data.shopName,
      message: data.message,
    },
  });

const listContactRequests = () =>
  prisma.contactRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

module.exports = {
  listBusinesses,
  findBusiness,
  updateStatus,
  upsertSubscription,
  createContactRequest,
  listContactRequests,
};
