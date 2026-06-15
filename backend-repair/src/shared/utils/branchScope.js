const AppError = require("../errors/AppError");
const prisma = require("../../core/database/prisma");

const ALL_BRANCHES = "__all__";

const hasBusinessWideAccess = (role) =>
  ["SUPER_ADMIN", "OWNER"].includes(role);

const getRequestedBranchId = (source = {}) =>
  source.branchId || source.branch_id || source["x-branch-id"] || null;

const getMainBranchId = async (businessId) => {
  const branch = await prisma.branch.findFirst({
    where: {
      businessId,
      isMainBranch: true,
      status: "ACTIVE",
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!branch) {
    throw new AppError("Active main branch is not configured", 409, {
      code: "MAIN_BRANCH_NOT_CONFIGURED",
    });
  }

  return branch.id;
};

const assertBranchBelongsToBusiness = async (businessId, branchId) => {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      businessId,
      status: "ACTIVE",
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!branch) {
    throw new AppError("Branch is not active or does not belong to this business", 403, {
      code: "BRANCH_ACCESS_DENIED",
    });
  }
};

const resolveBranchFilter = async (user, requestSource = {}) => {
  if (!user || !user.businessId) {
    throw new AppError("Authenticated business scope is required", 401, {
      code: "UNAUTHORIZED",
    });
  }

  const requestedBranchId = getRequestedBranchId(requestSource);

  if (user.role === "SUPER_ADMIN") {
    return requestedBranchId && requestedBranchId !== ALL_BRANCHES
      ? { branchId: requestedBranchId }
      : {};
  }

  if (user.role === "OWNER") {
    if (!requestedBranchId || requestedBranchId === ALL_BRANCHES) {
      return {};
    }

    await assertBranchBelongsToBusiness(user.businessId, requestedBranchId);
    return { branchId: requestedBranchId };
  }

  if (!user.branchId) {
    throw new AppError("Staff member is not assigned to a branch", 403, {
      code: "BRANCH_NOT_ASSIGNED",
    });
  }

  if (requestedBranchId && requestedBranchId !== user.branchId) {
    throw new AppError("Staff member cannot access another branch", 403, {
      code: "BRANCH_ACCESS_DENIED",
    });
  }

  return { branchId: user.branchId };
};

const resolveBranchIdForWrite = async (user, requestSource = {}) => {
  const requestedBranchId = getRequestedBranchId(requestSource);

  if (hasBusinessWideAccess(user.role)) {
    const branchId =
      requestedBranchId && requestedBranchId !== ALL_BRANCHES
        ? requestedBranchId
        : await getMainBranchId(user.businessId);
    await assertBranchBelongsToBusiness(user.businessId, branchId);
    return branchId;
  }

  if (!user.branchId) {
    throw new AppError("Staff member is not assigned to a branch", 403, {
      code: "BRANCH_NOT_ASSIGNED",
    });
  }

  if (requestedBranchId && requestedBranchId !== user.branchId) {
    throw new AppError("Staff member cannot write to another branch", 403, {
      code: "BRANCH_ACCESS_DENIED",
    });
  }

  return user.branchId;
};

module.exports = {
  ALL_BRANCHES,
  hasBusinessWideAccess,
  resolveBranchFilter,
  resolveBranchIdForWrite,
  assertBranchBelongsToBusiness,
  getMainBranchId,
};
