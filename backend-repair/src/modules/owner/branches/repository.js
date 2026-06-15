const prisma = require("../../../core/database/prisma");

const branchSelect = {
  id: true,
  businessId: true,
  name: true,
  code: true,
  phone: true,
  email: true,
  address: true,
  isMainBranch: true,
  status: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
};

const listBranches = (businessId) =>
  prisma.branch.findMany({
    where: {
      businessId,
      deletedAt: null,
    },
    orderBy: [{ isMainBranch: "desc" }, { name: "asc" }],
    select: branchSelect,
  });

const findById = (businessId, branchId) =>
  prisma.branch.findFirst({
    where: {
      id: branchId,
      businessId,
      deletedAt: null,
    },
    select: branchSelect,
  });

const findByCode = (businessId, code) =>
  prisma.branch.findFirst({
    where: {
      businessId,
      code,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

const countActiveBranches = (businessId) =>
  prisma.branch.count({
    where: {
      businessId,
      status: "ACTIVE",
      deletedAt: null,
    },
  });

const createBranch = (businessId, data) =>
  prisma.$transaction(async (tx) => {
    if (data.isMainBranch) {
      await tx.branch.updateMany({
        where: {
          businessId,
          isMainBranch: true,
          deletedAt: null,
        },
        data: {
          isMainBranch: false,
        },
      });
    }

    return tx.branch.create({
      data: {
        businessId,
        name: data.name,
        code: data.code,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        isMainBranch: data.isMainBranch || false,
        status: "ACTIVE",
        metadata: data.metadata || null,
      },
      select: branchSelect,
    });
  });

const updateBranch = (businessId, branchId, data) =>
  prisma.$transaction(async (tx) => {
    if (data.isMainBranch === true) {
      await tx.branch.updateMany({
        where: {
          businessId,
          id: {
            not: branchId,
          },
          isMainBranch: true,
          deletedAt: null,
        },
        data: {
          isMainBranch: false,
        },
      });
    }

    return tx.branch.updateMany({
      where: {
        id: branchId,
        businessId,
        deletedAt: null,
      },
      data,
    });
  });

const setBranchStatus = (businessId, branchId, status) =>
  prisma.branch.updateMany({
    where: {
      id: branchId,
      businessId,
      deletedAt: null,
    },
    data: {
      status,
    },
  });

const deleteBranch = (businessId, branchId) =>
  prisma.branch.updateMany({
    where: {
      id: branchId,
      businessId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

module.exports = {
  branchSelect,
  listBranches,
  findById,
  findByCode,
  countActiveBranches,
  createBranch,
  updateBranch,
  setBranchStatus,
  deleteBranch,
};
