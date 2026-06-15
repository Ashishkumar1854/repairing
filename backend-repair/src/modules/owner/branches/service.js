const AppError = require("../../../shared/errors/AppError");
const branchRepository = require("./repository");

const assertOwner = (user) => {
  if (user.role !== "OWNER") {
    throw new AppError("Only owners can manage branches", 403, {
      code: "BRANCH_OWNER_REQUIRED",
    });
  }
};

const list = async (user) => {
  if (user.role === "SUPER_ADMIN") {
    throw new AppError("Select a business before listing branches", 400, {
      code: "BUSINESS_CONTEXT_REQUIRED",
    });
  }

  const branches = await branchRepository.listBranches(user.businessId);
  return { branches };
};

const ensureCodeAvailable = async (businessId, code, currentBranchId = null) => {
  const existing = await branchRepository.findByCode(businessId, code);
  if (existing && existing.id !== currentBranchId) {
    throw new AppError("Branch code is already in use for this business", 409, {
      code: "BRANCH_CODE_IN_USE",
    });
  }
};

const create = async (user, payload) => {
  assertOwner(user);
  if (!payload.code) {
    const prefix = payload.name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() || "BR";
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    payload.code = `${prefix}${randomSuffix}`;
  }
  await ensureCodeAvailable(user.businessId, payload.code);

  const branch = await branchRepository.createBranch(user.businessId, payload);
  return { branch };
};

const update = async (user, branchId, payload) => {
  assertOwner(user);
  const branch = await branchRepository.findById(user.businessId, branchId);
  if (!branch) {
    throw new AppError("Branch not found", 404, { code: "BRANCH_NOT_FOUND" });
  }

  if (payload.code) {
    await ensureCodeAvailable(user.businessId, payload.code, branchId);
  }

  if (payload.isMainBranch === false && branch.isMainBranch) {
    throw new AppError("Main branch cannot be unset directly", 400, {
      code: "MAIN_BRANCH_REQUIRED",
    });
  }

  await branchRepository.updateBranch(user.businessId, branchId, payload);
  const updated = await branchRepository.findById(user.businessId, branchId);
  return { branch: updated };
};

const setStatus = async (user, branchId, status) => {
  assertOwner(user);
  const branch = await branchRepository.findById(user.businessId, branchId);
  if (!branch) {
    throw new AppError("Branch not found", 404, { code: "BRANCH_NOT_FOUND" });
  }

  if (status === "INACTIVE") {
    if (branch.isMainBranch) {
      throw new AppError("Main branch cannot be deactivated", 400, {
        code: "MAIN_BRANCH_CANNOT_BE_DISABLED",
      });
    }

    const activeCount = await branchRepository.countActiveBranches(user.businessId);
    if (activeCount <= 1) {
      throw new AppError("Cannot deactivate the last active branch", 400, {
        code: "LAST_ACTIVE_BRANCH",
      });
    }
  }

  await branchRepository.setBranchStatus(user.businessId, branchId, status);
  const updated = await branchRepository.findById(user.businessId, branchId);
  return { branch: updated };
};

const deleteBranch = async (user, branchId) => {
  assertOwner(user);
  const branch = await branchRepository.findById(user.businessId, branchId);
  if (!branch) {
    throw new AppError("Branch not found", 404, { code: "BRANCH_NOT_FOUND" });
  }

  if (branch.isMainBranch) {
    throw new AppError("Main branch cannot be deleted", 400, {
      code: "MAIN_BRANCH_CANNOT_BE_DELETED",
    });
  }

  await branchRepository.deleteBranch(user.businessId, branchId);
  return { deleted: true };
};

const getById = async (user, branchId) => {
  assertOwner(user);
  const branch = await branchRepository.findById(user.businessId, branchId);
  if (!branch) {
    throw new AppError("Branch not found", 404, { code: "BRANCH_NOT_FOUND" });
  }
  return { branch };
};

module.exports = {
  list,
  create,
  update,
  getById,
  activate: (user, branchId) => setStatus(user, branchId, "ACTIVE"),
  deactivate: (user, branchId) => setStatus(user, branchId, "INACTIVE"),
  deleteBranch,
};
