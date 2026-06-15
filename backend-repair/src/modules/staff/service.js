const AppError = require("../../shared/errors/AppError");
const { hashPassword } = require("../../shared/utils/password");
const {
  assertBranchBelongsToBusiness,
  resolveBranchIdForWrite,
  resolveBranchFilter,
} = require("../../shared/utils/branchScope");
const staffRepository = require("./repository");

const list = async (user, query = {}) => {
  const branchFilter = await resolveBranchFilter(user, query);
  const where = {
    ...branchFilter,
  };

  if (user.role === "ADMIN") {
    where.role = "TECHNICIAN";
  } else if (user.role === "OWNER") {
    where.role = "ADMIN";
  }

  const staff = await staffRepository.listStaff(user.businessId, where);

  return { staff };
};

const createStaff = async (user, payload) => {
  if (!["OWNER", "ADMIN"].includes(user.role)) {
    throw new AppError("Insufficient permissions", 403, {
      code: "STAFF_FORBIDDEN",
    });
  }

  // Determine target role automatically based on who is creating the staff
  const targetRole = user.role === "OWNER" ? "ADMIN" : "TECHNICIAN";

  // Reject invalid role combinations if specified
  if (payload.role && payload.role !== targetRole) {
    throw new AppError(`Invalid role selection. ${user.role}s can only create ${targetRole}s.`, 400, {
      code: "INVALID_ROLE_COMBINATION",
    });
  }

  const branchId = await resolveBranchIdForWrite(user, {
    branchId: payload.branchId,
  });

  if (!branchId) {
    throw new AppError("Branch is required for Admin and Technician users", 400, {
      code: "STAFF_BRANCH_REQUIRED",
    });
  }

  // Verify branch assignment during creation
  if (user.role === "ADMIN" && payload.branchId && payload.branchId !== user.branchId) {
    throw new AppError("Admins can only create staff in their own branch", 403, {
      code: "STAFF_BRANCH_ACCESS_DENIED",
    });
  }

  await assertBranchBelongsToBusiness(user.businessId, branchId);

  const existing = await staffRepository.findByEmail(user.businessId, payload.email);
  if (existing) {
    throw new AppError("Staff email is already in use", 409, {
      code: "STAFF_EMAIL_IN_USE",
    });
  }

  const staff = await staffRepository.createStaff(user.businessId, {
    name: payload.name,
    email: payload.email,
    phone: payload.phone || null,
    passwordHash: await hashPassword(payload.password),
    role: targetRole,
    branchId,
  });

  return { staff };
};

const assertManagedStaff = async (user, staffId) => {
  const staff = await staffRepository.findManagedStaff(user.businessId, staffId);
  if (!staff) {
    throw new AppError("Managed staff member not found", 404, {
      code: "STAFF_NOT_FOUND",
    });
  }

  if (user.role === "OWNER") {
    if (staff.role !== "ADMIN") {
      throw new AppError("Owners can manage branch admins only", 403, {
        code: "STAFF_MANAGEMENT_FORBIDDEN",
      });
    }
  }

  if (user.role === "ADMIN") {
    if (staff.role !== "TECHNICIAN") {
      throw new AppError("Admins can manage technicians only", 403, {
        code: "STAFF_MANAGEMENT_FORBIDDEN",
      });
    }
    if (staff.branchId !== user.branchId) {
      throw new AppError("Admins can only manage staff in their own branch", 403, {
        code: "STAFF_BRANCH_ACCESS_DENIED",
      });
    }
  }

  return staff;
};

const disable = async (user, staffId) => {
  await assertManagedStaff(user, staffId);
  await staffRepository.setActive(user.businessId, staffId, false);
  return { disabled: true };
};

const enable = async (user, staffId) => {
  await assertManagedStaff(user, staffId);
  await staffRepository.setActive(user.businessId, staffId, true);
  return { enabled: true };
};

const resetPassword = async (user, staffId, { password }) => {
  await assertManagedStaff(user, staffId);
  await staffRepository.updatePassword(user.businessId, staffId, await hashPassword(password));
  return { reset: true };
};

const assignBranch = async (user, staffId, { branchId }) => {
  if (user.role !== "OWNER") {
    throw new AppError("Only owners can assign staff to branches", 403, {
      code: "STAFF_BRANCH_OWNER_REQUIRED",
    });
  }

  const staff = await assertManagedStaff(user, staffId);
  if (!["ADMIN", "TECHNICIAN"].includes(staff.role)) {
    throw new AppError("Only Admin and Technician staff can be assigned to a branch", 400, {
      code: "STAFF_BRANCH_ROLE_INVALID",
    });
  }

  await assertBranchBelongsToBusiness(user.businessId, branchId);
  await staffRepository.updateBranch(user.businessId, staffId, branchId);

  return { assigned: true };
};

const deleteStaff = async (user, staffId) => {
  const staff = await assertManagedStaff(user, staffId);
  await staffRepository.deleteStaff(user.businessId, staffId, staff.email);
  return { deleted: true };
};

module.exports = {
  list,
  createStaff,
  disable,
  enable,
  resetPassword,
  assignBranch,
  deleteStaff,
};
