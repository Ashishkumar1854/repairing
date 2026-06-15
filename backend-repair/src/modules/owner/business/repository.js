const prisma = require("../../../core/database/prisma");

const businessSelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  status: true,
  description: true,
  logo: true,
  banner: true,
  phone: true,
  email: true,
  website: true,
  country: true,
  state: true,
  city: true,
  address: true,
  gstNumber: true,
  createdAt: true,
  updatedAt: true,
};

const findById = (businessId) =>
  prisma.business.findFirst({
    where: {
      id: businessId,
      deletedAt: null,
    },
    select: businessSelect,
  });

const findBySlug = (slug) =>
  prisma.business.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

const update = (businessId, data) =>
  prisma.business.update({
    where: {
      id: businessId,
    },
    data,
    select: businessSelect,
  });

module.exports = {
  findById,
  findBySlug,
  update,
};
