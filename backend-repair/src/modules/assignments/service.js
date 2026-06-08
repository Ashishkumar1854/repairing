const AppError = require("../../shared/errors/AppError");
const { ROLES } = require("../auth/constants");
const { TICKET_STATUSES } = require("../repair/constants");
const { assertCanTransition } = require("../repair/workflow");
const assignmentRepository = require("./repository");
const { ASSIGNMENT_ERRORS, MANAGER_ROLES } = require("./constants");

const mapOutcomeToError = (outcome) => {
  const errorMap = {
    TICKET_NOT_FOUND: ["Repair ticket not found", 404, ASSIGNMENT_ERRORS.TICKET_NOT_FOUND],
    TECHNICIAN_NOT_FOUND: ["Technician not found", 404, ASSIGNMENT_ERRORS.TECHNICIAN_NOT_FOUND],
    TECHNICIAN_INACTIVE: ["Technician is inactive", 409, ASSIGNMENT_ERRORS.TECHNICIAN_INACTIVE],
    INVALID_TECHNICIAN_ROLE: [
      "Assigned staff member must have TECHNICIAN role",
      409,
      ASSIGNMENT_ERRORS.INVALID_TECHNICIAN_ROLE,
    ],
    ALREADY_ASSIGNED: [
      "Ticket is already assigned to this technician",
      409,
      ASSIGNMENT_ERRORS.ALREADY_ASSIGNED,
    ],
    ACTIVE_ASSIGNMENT_EXISTS: [
      "Ticket already has an active assignment. Use reassignment workflow.",
      409,
      ASSIGNMENT_ERRORS.ACTIVE_ASSIGNMENT_EXISTS,
    ],
    ACTIVE_ASSIGNMENT_NOT_FOUND: [
      "Ticket does not have an active assignment to reassign",
      404,
      ASSIGNMENT_ERRORS.ACTIVE_ASSIGNMENT_NOT_FOUND,
    ],
    INVALID_TICKET_STATUS: [
      "Ticket status does not allow assignment changes",
      409,
      ASSIGNMENT_ERRORS.INVALID_TICKET_STATUS,
    ],
    STATUS_CONFLICT: [
      "Ticket workflow changed while assigning technician",
      409,
      ASSIGNMENT_ERRORS.STATUS_CONFLICT,
    ],
  };

  const [message, statusCode, code] = errorMap[outcome] || [
    "Assignment operation failed",
    500,
    outcome,
  ];

  return new AppError(message, statusCode, { code });
};

const assignTechnician = async (user, ticketId, payload) => {
  assertCanTransition(TICKET_STATUSES.RECEIVED, TICKET_STATUSES.DIAGNOSING);

  const result = await assignmentRepository.createAssignment({
    businessId: user.businessId,
    ticketId,
    technicianId: payload.technicianId,
    actorStaffId: user.staffId,
    notes: payload.notes,
    metadata: payload.metadata,
    shouldStartDiagnosis: true,
  });

  if (result.outcome !== "ASSIGNED") {
    throw mapOutcomeToError(result.outcome);
  }

  return {
    assignment: result.assignment,
    history: result.history,
    ticketStatus: result.ticketStatus,
  };
};

const reassignTechnician = async (user, ticketId, payload) => {
  const result = await assignmentRepository.reassignTicket({
    businessId: user.businessId,
    ticketId,
    technicianId: payload.technicianId,
    actorStaffId: user.staffId,
    reason: payload.reason,
    notes: payload.notes,
    metadata: payload.metadata,
  });

  if (result.outcome !== "REASSIGNED") {
    throw mapOutcomeToError(result.outcome);
  }

  return {
    assignment: result.assignment,
    history: result.history,
    previousAssignment: result.previousAssignment,
    ticketStatus: result.ticketStatus,
  };
};

const getAssignmentHistory = async (user, ticketId) => {
  const ticket = await assignmentRepository.findTicketForHistory(user.businessId, ticketId);

  if (!ticket) {
    throw new AppError("Repair ticket not found", 404, {
      code: ASSIGNMENT_ERRORS.TICKET_NOT_FOUND,
    });
  }

  const assignments = await assignmentRepository.listAssignmentHistory(user.businessId, ticketId);

  return {
    ticket,
    assignments,
  };
};

const getMyQueue = async (user, query) => {
  const { assignments, total } = await assignmentRepository.getTechnicianQueue({
    businessId: user.businessId,
    technicianId: user.staffId,
    query,
  });

  return {
    assignments,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

const getMyDashboard = async (user) => {
  const dashboard = await assignmentRepository.getTechnicianDashboard({
    businessId: user.businessId,
    technicianId: user.staffId,
  });

  return {
    dashboard,
  };
};

const canOverrideTechnicianOwnership = (user) => MANAGER_ROLES.has(user.role);

const assertTicketOwnershipForTechnician = async (user, ticketId) => {
  if (canOverrideTechnicianOwnership(user)) {
    return;
  }

  if (user.role !== ROLES.TECHNICIAN) {
    return;
  }

  const isAssigned = await assignmentRepository.isTechnicianAssignedToTicket(
    user.businessId,
    user.staffId,
    ticketId
  );

  if (!isAssigned) {
    throw new AppError("Technician is not assigned to this repair ticket", 403, {
      code: ASSIGNMENT_ERRORS.ACTIVE_ASSIGNMENT_NOT_FOUND,
    });
  }
};

module.exports = {
  assignTechnician,
  reassignTechnician,
  getAssignmentHistory,
  getMyQueue,
  getMyDashboard,
  canOverrideTechnicianOwnership,
  assertTicketOwnershipForTechnician,
};
