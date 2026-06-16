const prisma = require("../../../core/database/prisma");

const subscriptionSelect = {
  id: true,
  businessId: true,
  plan: true,
  status: true,
  startsAt: true,
  expiresAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
};

const businessSubscriptionSelect = {
  id: true,
  name: true,
  slug: true,
  email: true,
  phone: true,
  subscription: {
    select: subscriptionSelect,
  },
  staff: {
    where: {
      role: "OWNER",
      deletedAt: null,
    },
    take: 1,
    select: {
      fullName: true,
      email: true,
      phone: true,
    },
  },
};

const findCurrent = (businessId) =>
  prisma.subscription.findUnique({
    where: { businessId },
    select: subscriptionSelect,
  });

const countDevices = (businessId) =>
  prisma.repairTicket.count({
    where: {
      businessId,
      deletedAt: null,
    },
  });

const countBranches = (businessId) =>
  prisma.branch.count({
    where: {
      businessId,
      deletedAt: null,
    },
  });

const findBusiness = (businessId) =>
  prisma.business.findFirst({
    where: {
      id: businessId,
      deletedAt: null,
    },
    select: businessSubscriptionSelect,
  });

const upsertPaymentRequest = (businessId, data) =>
  prisma.subscription.upsert({
    where: { businessId },
    update: data,
    create: {
      businessId,
      ...data,
    },
    select: subscriptionSelect,
  });

const upsertTrial = (businessId, metadata) =>
  prisma.subscription.upsert({
    where: { businessId },
    update: {
      plan: "STARTER",
      status: "TRIALING",
      startsAt: new Date(),
      expiresAt: null,
      metadata,
    },
    create: {
      businessId,
      plan: "STARTER",
      status: "TRIALING",
      metadata,
    },
    select: subscriptionSelect,
  });

const expireTrial = (businessId, metadata) =>
  prisma.subscription.update({
    where: { businessId },
    data: {
      status: "EXPIRED",
      metadata,
    },
    select: subscriptionSelect,
  });

module.exports = {
  findCurrent,
  countDevices,
  countBranches,
  findBusiness,
  upsertPaymentRequest,
  upsertTrial,
  expireTrial,
};
