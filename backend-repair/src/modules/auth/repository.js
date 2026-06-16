const prisma = require("../../core/database/prisma");

const staffSelect = {
  id: true,
  businessId: true,
  branchId: true,
  fullName: true,
  email: true,
  passwordHash: true,
  refreshTokenHash: true,
  refreshTokenExpiresAt: true,
  passwordResetTokenHash: true,
  passwordResetExpiresAt: true,
  role: true,
  isActive: true,
  deletedAt: true,
  business: {
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      status: true,
      deletedAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          startsAt: true,
          expiresAt: true,
        },
      },
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      metadata: true,
      deletedAt: true,
    },
  },
};

const publicStaffSelect = {
  id: true,
  businessId: true,
  branchId: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  business: {
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      status: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          startsAt: true,
          expiresAt: true,
        },
      },
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      metadata: true,
      deletedAt: true,
    },
  },
};

const findStaffByEmail = (email) =>
  prisma.staffMember.findMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
      deletedAt: null,
      business: {
        deletedAt: null,
      },
    },
    select: staffSelect,
  });

const findStaffById = (staffId) =>
  prisma.staffMember.findFirst({
    where: {
      id: staffId,
      deletedAt: null,
      business: {
        deletedAt: null,
      },
    },
    select: staffSelect,
  });

const findStaffByIdForBusiness = (staffId, businessId) =>
  prisma.staffMember.findFirst({
    where: {
      id: staffId,
      businessId,
      deletedAt: null,
      business: {
        deletedAt: null,
      },
    },
    select: publicStaffSelect,
  });

const updateRefreshToken = (staffId, businessId, refreshTokenHash, refreshTokenExpiresAt) =>
  prisma.staffMember.updateMany({
    where: {
      id: staffId,
      businessId,
      deletedAt: null,
    },
    data: {
      refreshTokenHash,
      refreshTokenExpiresAt,
    },
  });

const clearRefreshToken = (staffId, businessId) =>
  prisma.staffMember.updateMany({
    where: {
      id: staffId,
      businessId,
      deletedAt: null,
    },
    data: {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });

const updatePassword = (staffId, businessId, passwordHash) =>
  prisma.staffMember.updateMany({
    where: {
      id: staffId,
      businessId,
      deletedAt: null,
    },
    data: {
      passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });

const setPasswordResetToken = (staffId, businessId, passwordResetTokenHash, passwordResetExpiresAt) =>
  prisma.staffMember.updateMany({
    where: {
      id: staffId,
      businessId,
      deletedAt: null,
    },
    data: {
      passwordResetTokenHash,
      passwordResetExpiresAt,
    },
  });

const findStaffByResetTokenHash = (passwordResetTokenHash) =>
  prisma.staffMember.findFirst({
    where: {
      passwordResetTokenHash,
      deletedAt: null,
      business: {
        deletedAt: null,
      },
    },
    select: staffSelect,
  });

const findBusinessBySlug = (slug) =>
  prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
    },
  });

const createOwnerTenant = ({ business, branch, owner, subscription }) =>
  prisma.$transaction(async (tx) => {
    const createdBusiness = await tx.business.create({
      data: business,
    });

    const createdBranch = await tx.branch.create({
      data: {
        ...branch,
        businessId: createdBusiness.id,
      },
    });

    const createdOwner = await tx.staffMember.create({
      data: {
        ...owner,
        businessId: createdBusiness.id,
      },
      select: publicStaffSelect,
    });

    const createdSubscription = await tx.subscription.create({
      data: {
        ...subscription,
        businessId: createdBusiness.id,
      },
    });

    return {
      business: createdBusiness,
      branch: createdBranch,
      owner: {
        ...createdOwner,
        business: {
          ...createdOwner.business,
          subscription: createdSubscription,
        },
      },
      subscription: createdSubscription,
    };
  });

module.exports = {
  findStaffByEmail,
  findStaffById,
  findStaffByIdForBusiness,
  findBusinessBySlug,
  createOwnerTenant,
  updateRefreshToken,
  clearRefreshToken,
  updatePassword,
  setPasswordResetToken,
  findStaffByResetTokenHash,
};
