const crypto = require("crypto");

const AppError = require("../../shared/errors/AppError");
const repairRepository = require("./repository");
const { REPAIR_ERRORS, TICKET_STATUSES } = require("./constants");
const { assertCanTransition, isTerminalStatus } = require("./workflow");

const generateTicketNumber = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `REP-${datePart}-${timePart}-${suffix}`;
};

const createTicket = async (user, payload) => {
  const ticket = await repairRepository.createTicketIntake(user.businessId, user.staffId, {
    ...payload,
    ticketNumber: generateTicketNumber(),
  });

  if (!ticket) {
    throw new AppError("Customer not found for this business", 404, {
      code: REPAIR_ERRORS.CUSTOMER_NOT_FOUND,
    });
  }

  return {
    ticket,
  };
};

const listTickets = async (user, query) => {
  const { tickets, total } = await repairRepository.listTickets({
    businessId: user.businessId,
    page: query.page,
    limit: query.limit,
    status: query.status,
    priority: query.priority,
    customerId: query.customerId,
    search: query.search,
  });

  return {
    tickets,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

const getTicket = async (user, ticketId) => {
  const ticket = await repairRepository.findTicketById(user.businessId, ticketId);

  if (!ticket) {
    throw new AppError("Repair ticket not found", 404, {
      code: REPAIR_ERRORS.TICKET_NOT_FOUND,
    });
  }

  return {
    ticket,
  };
};

const updateTicketStatus = async (user, ticketId, payload) => {
  const currentTicket = await repairRepository.findTicketById(user.businessId, ticketId);

  if (!currentTicket) {
    throw new AppError("Repair ticket not found", 404, {
      code: REPAIR_ERRORS.TICKET_NOT_FOUND,
    });
  }

  if (currentTicket.status === payload.status) {
    return {
      ticket: currentTicket,
      transitionApplied: false,
    };
  }

  assertCanTransition(currentTicket.status, payload.status);

  const transitionedTicket = await repairRepository.transitionTicketStatus({
    businessId: user.businessId,
    ticketId,
    actorStaffId: user.staffId,
    fromStatus: currentTicket.status,
    toStatus: payload.status,
    reason: payload.reason,
    metadata: payload.metadata,
    closedAt: isTerminalStatus(payload.status) ? new Date() : currentTicket.closedAt,
  });

  if (!transitionedTicket) {
    throw new AppError("Repair ticket status changed while processing request", 409, {
      code: REPAIR_ERRORS.STATUS_CONFLICT,
    });
  }

  return {
    ticket: transitionedTicket,
    transitionApplied: true,
  };
};

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicketStatus,
};
