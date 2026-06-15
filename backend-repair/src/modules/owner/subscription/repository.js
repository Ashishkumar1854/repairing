const prisma = require("../../../core/database/prisma");

const subscriptionSelect = {
  id: true,
  businessId: true,
  plan: true,
  status: true,
  startsAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
};

const findCurrent = (businessId) =>
  prisma.subscription.findUnique({
    where: { businessId },
    select: subscriptionSelect,
  });

module.exports = {
  findCurrent,
};
