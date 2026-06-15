const AppError = require("../../shared/errors/AppError");
const { REPAIR_ERRORS, TICKET_STATUSES } = require("./constants");

const allowedTransitions = Object.freeze({
  [TICKET_STATUSES.RECEIVED]: [
    TICKET_STATUSES.DIAGNOSING,
    TICKET_STATUSES.CANCELLED,
  ],
  [TICKET_STATUSES.DIAGNOSING]: [
    TICKET_STATUSES.ESTIMATE_PENDING,
    TICKET_STATUSES.IN_REPAIR,
    TICKET_STATUSES.WAITING_PARTS,
    TICKET_STATUSES.CANCELLED,
  ],
  [TICKET_STATUSES.ESTIMATE_PENDING]: [
    TICKET_STATUSES.WAITING_APPROVAL,
    TICKET_STATUSES.CANCELLED,
  ],
  [TICKET_STATUSES.WAITING_APPROVAL]: [
    TICKET_STATUSES.APPROVED,
    TICKET_STATUSES.CANCELLED,
  ],
  [TICKET_STATUSES.APPROVED]: [
    TICKET_STATUSES.IN_REPAIR,
    TICKET_STATUSES.WAITING_PARTS,
    TICKET_STATUSES.SENT_TO_VENDOR,
  ],
  [TICKET_STATUSES.IN_REPAIR]: [
    TICKET_STATUSES.WAITING_PARTS,
    TICKET_STATUSES.SENT_TO_VENDOR,
    TICKET_STATUSES.READY_FOR_REVIEW,
    TICKET_STATUSES.READY_FOR_DELIVERY,
    TICKET_STATUSES.CANCELLED,
  ],
  [TICKET_STATUSES.WAITING_PARTS]: [
    TICKET_STATUSES.IN_REPAIR,
    TICKET_STATUSES.SENT_TO_VENDOR,
    TICKET_STATUSES.CANCELLED,
  ],
  [TICKET_STATUSES.SENT_TO_VENDOR]: [
    TICKET_STATUSES.IN_REPAIR,
    TICKET_STATUSES.READY_FOR_REVIEW,
    TICKET_STATUSES.READY_FOR_DELIVERY,
    TICKET_STATUSES.CANCELLED,
  ],
  [TICKET_STATUSES.READY_FOR_REVIEW]: [
    TICKET_STATUSES.IN_REPAIR,
    TICKET_STATUSES.SENT_TO_VENDOR,
    TICKET_STATUSES.READY_FOR_DELIVERY,
    TICKET_STATUSES.CANCELLED,
  ],
  [TICKET_STATUSES.READY_FOR_DELIVERY]: [
    TICKET_STATUSES.DELIVERED,
    TICKET_STATUSES.IN_REPAIR,
  ],
  [TICKET_STATUSES.DELIVERED]: [TICKET_STATUSES.CLOSED],
  [TICKET_STATUSES.CANCELLED]: [TICKET_STATUSES.CLOSED],
  [TICKET_STATUSES.CLOSED]: [],
});

const terminalStatuses = new Set([TICKET_STATUSES.CLOSED]);

const getAllowedTransitions = (status) => allowedTransitions[status] || [];

const canTransition = (fromStatus, toStatus) =>
  getAllowedTransitions(fromStatus).includes(toStatus);

const assertCanTransition = (fromStatus, toStatus) => {
  if (!canTransition(fromStatus, toStatus)) {
    throw new AppError(`Invalid repair status transition: ${fromStatus} -> ${toStatus}`, 409, {
      code: REPAIR_ERRORS.INVALID_STATUS_TRANSITION,
      errors: {
        fromStatus,
        toStatus,
        allowedTransitions: getAllowedTransitions(fromStatus),
      },
    });
  }
};

const isTerminalStatus = (status) => terminalStatuses.has(status);

module.exports = {
  allowedTransitions,
  getAllowedTransitions,
  canTransition,
  assertCanTransition,
  isTerminalStatus,
};
