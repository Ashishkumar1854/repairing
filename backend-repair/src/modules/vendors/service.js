const AppError = require("../../shared/errors/AppError");
const { ROLES } = require("../auth/constants");
const { TICKET_STATUSES } = require("../repair/constants");
const { assertCanTransition } = require("../repair/workflow");
const { CUSTODY_HOLDER_TYPES } = require("../handover/constants");
const assignmentService = require("../assignments/service");
const vendorRepository = require("./repository");
const { resolveBranchFilter } = require("../../shared/utils/branchScope");
const {
  VENDOR_ERRORS,
  VENDOR_REPAIR_STATUSES,
} = require("./constants");

const vendorStatusTransitions = Object.freeze({
  [VENDOR_REPAIR_STATUSES.DISPATCHED]: [
    VENDOR_REPAIR_STATUSES.IN_PROGRESS,
    VENDOR_REPAIR_STATUSES.WAITING_VENDOR_QUOTE,
    VENDOR_REPAIR_STATUSES.COMPLETED,
    VENDOR_REPAIR_STATUSES.CANCELLED,
  ],
  [VENDOR_REPAIR_STATUSES.IN_PROGRESS]: [
    VENDOR_REPAIR_STATUSES.WAITING_VENDOR_QUOTE,
    VENDOR_REPAIR_STATUSES.COMPLETED,
    VENDOR_REPAIR_STATUSES.CANCELLED,
  ],
  [VENDOR_REPAIR_STATUSES.WAITING_VENDOR_QUOTE]: [
    VENDOR_REPAIR_STATUSES.IN_PROGRESS,
    VENDOR_REPAIR_STATUSES.COMPLETED,
    VENDOR_REPAIR_STATUSES.CANCELLED,
  ],
  [VENDOR_REPAIR_STATUSES.COMPLETED]: [VENDOR_REPAIR_STATUSES.RETURNED],
  [VENDOR_REPAIR_STATUSES.RETURNED]: [],
  [VENDOR_REPAIR_STATUSES.CANCELLED]: [],
});

const dispatchableTicketStatuses = new Set([
  TICKET_STATUSES.APPROVED,
  TICKET_STATUSES.IN_REPAIR,
  TICKET_STATUSES.WAITING_PARTS,
]);

const mapOutcomeToError = (outcome) => {
  const errors = {
    VENDOR_NOT_FOUND: ["Vendor not found", 404, VENDOR_ERRORS.VENDOR_NOT_FOUND],
    VENDOR_INACTIVE: ["Vendor is inactive", 409, VENDOR_ERRORS.VENDOR_INACTIVE],
    TICKET_NOT_FOUND: ["Repair ticket not found", 404, VENDOR_ERRORS.TICKET_NOT_FOUND],
    JOB_NOT_FOUND: ["Vendor repair job not found", 404, VENDOR_ERRORS.JOB_NOT_FOUND],
    ACTIVE_JOB_EXISTS: [
      "Repair ticket already has an active vendor repair job",
      409,
      VENDOR_ERRORS.ACTIVE_JOB_EXISTS,
    ],
    INVALID_JOB_STATUS: [
      "Vendor repair job status does not allow this operation",
      409,
      VENDOR_ERRORS.INVALID_JOB_STATUS,
    ],
    WORKFLOW_CONFLICT: [
      "Repair ticket workflow changed while processing vendor repair",
      409,
      VENDOR_ERRORS.WORKFLOW_CONFLICT,
    ],
  };

  const [message, statusCode, code] = errors[outcome] || [
    "Vendor repair operation failed",
    500,
    outcome,
  ];

  return new AppError(message, statusCode, { code });
};

const assertVendorJobTransition = (fromStatus, toStatus) => {
  const allowed = vendorStatusTransitions[fromStatus] || [];

  if (!allowed.includes(toStatus)) {
    throw new AppError(`Invalid vendor repair status transition: ${fromStatus} -> ${toStatus}`, 409, {
      code: VENDOR_ERRORS.INVALID_JOB_STATUS,
      errors: {
        fromStatus,
        toStatus,
        allowedTransitions: allowed,
      },
    });
  }
};

const createVendor = async (user, payload) => {
  const vendor = await vendorRepository.createVendor({
    businessId: user.businessId,
    data: payload,
  });

  return { vendor };
};

const listVendors = async (user, query) => {
  const { vendors, total } = await vendorRepository.listVendors({
    businessId: user.businessId,
    query,
  });

  return {
    vendors,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

const getVendor = async (user, vendorId) => {
  const vendor = await vendorRepository.findVendorById(user.businessId, vendorId);

  if (!vendor) {
    throw mapOutcomeToError("VENDOR_NOT_FOUND");
  }

  return { vendor };
};

const updateVendor = async (user, vendorId, payload) => {
  const result = await vendorRepository.updateVendor({
    businessId: user.businessId,
    vendorId,
    data: payload,
  });

  if (result.count !== 1) {
    throw mapOutcomeToError("VENDOR_NOT_FOUND");
  }

  const vendor = await vendorRepository.findVendorById(user.businessId, vendorId);

  return { vendor };
};

const dispatchVendorRepair = async (user, ticketId, payload) => {
  await assignmentService.assertTicketOwnershipForTechnician(user, ticketId);
  const branchFilter = await resolveBranchFilter(user, payload);

  const ticket = await vendorRepository.findTicketForVendorRepair(
    user.businessId,
    ticketId,
    branchFilter
  );

  if (!ticket) {
    throw mapOutcomeToError("TICKET_NOT_FOUND");
  }

  if (!dispatchableTicketStatuses.has(ticket.status)) {
    throw new AppError("Repair ticket status does not allow vendor dispatch", 409, {
      code: VENDOR_ERRORS.INVALID_TICKET_STATUS,
      errors: {
        status: ticket.status,
        allowedStatuses: Array.from(dispatchableTicketStatuses),
      },
    });
  }

  if (ticket.currentHolderType !== CUSTODY_HOLDER_TYPES.TECHNICIAN) {
    throw new AppError("Repair must be in technician custody before vendor dispatch", 409, {
      code: VENDOR_ERRORS.INVALID_TICKET_STATUS,
      errors: {
        currentHolderType: ticket.currentHolderType,
        expectedHolderType: CUSTODY_HOLDER_TYPES.TECHNICIAN,
      },
    });
  }

  assertCanTransition(ticket.status, TICKET_STATUSES.SENT_TO_VENDOR);

  const result = await vendorRepository.dispatchVendorRepair({
    businessId: user.businessId,
    branchFilter,
    ticketId,
    vendorId: payload.vendorId,
    actorStaffId: user.staffId,
    data: payload,
    workflowTransition: {
      fromStatus: ticket.status,
      toStatus: TICKET_STATUSES.SENT_TO_VENDOR,
      reason: "Repair dispatched to external vendor",
    },
  });

  if (result.outcome !== "DISPATCHED") {
    throw mapOutcomeToError(result.outcome);
  }

  return { vendorRepairJob: result.job };
};

const listVendorRepairJobs = async (user, query) => {
  const branchFilter = await resolveBranchFilter(user, query);
  const { jobs, total } = await vendorRepository.listVendorRepairJobs({
    businessId: user.businessId,
    branchFilter,
    query,
  });

  return {
    vendorRepairJobs: jobs,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

const getVendorRepairJob = async (user, jobId) => {
  const branchFilter = await resolveBranchFilter(user);
  const job = await vendorRepository.findVendorRepairJobById(user.businessId, jobId, branchFilter);

  if (!job) {
    throw mapOutcomeToError("JOB_NOT_FOUND");
  }

  return { vendorRepairJob: job };
};

const updateVendorRepairStatus = async (user, jobId, payload) => {
  const branchFilter = await resolveBranchFilter(user, payload);
  const job = await vendorRepository.findVendorRepairJobById(user.businessId, jobId, branchFilter);

  if (!job) {
    throw mapOutcomeToError("JOB_NOT_FOUND");
  }

  assertVendorJobTransition(job.status, payload.status);

  const result = await vendorRepository.updateVendorRepairStatus({
    businessId: user.businessId,
    branchFilter,
    jobId,
    actorStaffId: user.staffId,
    data: payload,
  });

  if (result.outcome !== "UPDATED") {
    throw mapOutcomeToError(result.outcome);
  }

  return { vendorRepairJob: result.job };
};

const receiveVendorRepair = async (user, jobId, payload) => {
  const branchFilter = await resolveBranchFilter(user, payload);
  const job = await vendorRepository.findVendorRepairJobById(user.businessId, jobId, branchFilter);

  if (!job) {
    throw mapOutcomeToError("JOB_NOT_FOUND");
  }

  assertVendorJobTransition(job.status, VENDOR_REPAIR_STATUSES.RETURNED);
  assertCanTransition(TICKET_STATUSES.SENT_TO_VENDOR, payload.nextTicketStatus);

  const result = await vendorRepository.receiveVendorRepair({
    businessId: user.businessId,
    branchFilter,
    jobId,
    actorStaffId: user.staffId,
    data: payload,
    workflowTransition: {
      fromStatus: TICKET_STATUSES.SENT_TO_VENDOR,
      toStatus: payload.nextTicketStatus,
      reason: "Repair received from external vendor",
    },
  });

  if (result.outcome !== "RECEIVED") {
    throw mapOutcomeToError(result.outcome);
  }

  return { vendorRepairJob: result.job };
};

const recordVendorRepairCost = async (user, jobId, payload) => {
  const branchFilter = await resolveBranchFilter(user, payload);
  const result = await vendorRepository.recordVendorRepairCost({
    businessId: user.businessId,
    branchFilter,
    jobId,
    actorStaffId: user.staffId,
    data: payload,
  });

  if (result.outcome !== "COST_RECORDED") {
    throw mapOutcomeToError(result.outcome);
  }

  return { vendorRepairJob: result.job };
};

const getVendorRepairPermissions = () => ({
  technicianOwnsVendorDispatch: true,
  managerOverrideRoles: [ROLES.ADMIN],
});

module.exports = {
  createVendor,
  listVendors,
  getVendor,
  updateVendor,
  dispatchVendorRepair,
  listVendorRepairJobs,
  getVendorRepairJob,
  updateVendorRepairStatus,
  receiveVendorRepair,
  recordVendorRepairCost,
  getVendorRepairPermissions,
};
