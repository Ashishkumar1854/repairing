const prisma = require("../../core/database/prisma");

const staffSelect = {
  id: true,
  businessId: true,
  branchId: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  },
};

const managedRoles = ["ADMIN", "TECHNICIAN"];

const listStaff = (businessId, where = {}) =>
  prisma.staffMember.findMany({
    where: {
      businessId,
      role: { in: managedRoles },
      deletedAt: null,
      ...where,
    },
    orderBy: [{ role: "asc" }, { isActive: "desc" }, { fullName: "asc" }],
    select: staffSelect,
  });

const findByEmail = (businessId, email) =>
  prisma.staffMember.findFirst({
    where: {
      businessId,
      email: {
        equals: email,
        mode: "insensitive",
      },
      deletedAt: null,
    },
    select: { id: true },
  });

const createStaff = (businessId, data) =>
  prisma.staffMember.create({
    data: {
      businessId,
      branchId: data.branchId || null,
      fullName: data.name,
      email: data.email,
      phone: data.phone || null,
      passwordHash: data.passwordHash,
      role: data.role,
    },
    select: staffSelect,
  });

const findManagedStaff = (businessId, staffId) =>
  prisma.staffMember.findFirst({
    where: {
      id: staffId,
      businessId,
      role: { in: managedRoles },
      deletedAt: null,
    },
    select: staffSelect,
  });

const setActive = (businessId, staffId, isActive) =>
  prisma.staffMember.updateMany({
    where: {
      id: staffId,
      businessId,
      role: { in: managedRoles },
      deletedAt: null,
    },
    data: {
      isActive,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });

const updatePassword = (businessId, staffId, passwordHash) =>
  prisma.staffMember.updateMany({
    where: {
      id: staffId,
      businessId,
      role: { in: managedRoles },
      deletedAt: null,
    },
    data: {
      passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });

const updateBranch = (businessId, staffId, branchId) =>
  prisma.staffMember.updateMany({
    where: {
      id: staffId,
      businessId,
      role: { in: managedRoles },
      deletedAt: null,
    },
    data: {
      branchId,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });

const deleteStaff = (businessId, staffId, email) =>
  prisma.staffMember.updateMany({
    where: {
      id: staffId,
      businessId,
      role: { in: managedRoles },
      deletedAt: null,
    },
    data: {
      email: `deleted_${Date.now()}_${email}`,
      deletedAt: new Date(),
      isActive: false,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });

module.exports = {
  listStaff,
  findByEmail,
  createStaff,
  findManagedStaff,
  setActive,
  updatePassword,
  updateBranch,
  deleteStaff,
};
