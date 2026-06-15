const AppError = require("../../shared/errors/AppError");
const { ROLES } = require("../auth/constants");
const { TICKET_STATUSES } = require("../repair/constants");
const { assertCanTransition } = require("../repair/workflow");
const { resolveBranchFilter } = require("../../shared/utils/branchScope");
const handoverRepository = require("./repository");
const {
  CUSTODY_HOLDER_TYPES,
  HANDOVER_TYPES,
  HANDOVER_ERRORS,
  OVERRIDE_ROLES,
} = require("./constants");

const transferDefinitions = Object.freeze({
  [HANDOVER_TYPES.RECEPTION_TO_TECHNICIAN]: {
    from: CUSTODY_HOLDER_TYPES.RECEPTION,
    to: CUSTODY_HOLDER_TYPES.TECHNICIAN,
  },
  [HANDOVER_TYPES.TECHNICIAN_TO_RECEPTION]: {
    from: CUSTODY_HOLDER_TYPES.TECHNICIAN,
    to: CUSTODY_HOLDER_TYPES.RECEPTION,
  },
  [HANDOVER_TYPES.TECHNICIAN_TO_VENDOR]: {
    from: CUSTODY_HOLDER_TYPES.TECHNICIAN,
    to: CUSTODY_HOLDER_TYPES.VENDOR,
  },
  [HANDOVER_TYPES.VENDOR_TO_RECEPTION]: {
    from: CUSTODY_HOLDER_TYPES.VENDOR,
    to: CUSTODY_HOLDER_TYPES.RECEPTION,
  },
  [HANDOVER_TYPES.RECEPTION_TO_CUSTOMER]: {
    from: CUSTODY_HOLDER_TYPES.RECEPTION,
    to: CUSTODY_HOLDER_TYPES.CUSTOMER,
  },
  [HANDOVER_TYPES.STORAGE_TRANSFER]: {
    from: null,
    to: CUSTODY_HOLDER_TYPES.STORAGE,
  },
});

const canOverride = (user) => OVERRIDE_ROLES.has(user.role);

const mapOutcomeToError = (outcome) => {
  const errors = {
    TICKET_NOT_FOUND: ["Repair ticket not found", 404, HANDOVER_ERRORS.TICKET_NOT_FOUND],
    WORKFLOW_CONFLICT: [
      "Repair ticket workflow changed while recording handover",
      409,
      HANDOVER_ERRORS.WORKFLOW_CONFLICT,
    ],
  };

  const [message, statusCode, code] = errors[outcome] || [
    "Handover operation failed",
    500,
    outcome,
  ];

  return new AppError(message, statusCode, { code });
};

const getExpectedTransfer = (payload) => {
  if (payload.type === HANDOVER_TYPES.INTERNAL_TRANSFER) {
    if (!payload.toHolderType) {
      throw new AppError("Internal transfer requires target holder type", 400, {
        code: HANDOVER_ERRORS.INVALID_TRANSFER,
      });
    }

    return {
      from: null,
      to: payload.toHolderType,
    };
  }

  return transferDefinitions[payload.type];
};

const assertHolderMatchesCurrentCustody = (ticket, expectedFrom, user) => {
  if (!expectedFrom || canOverride(user)) {
    return;
  }

  if (ticket.currentHolderType !== expectedFrom) {
    throw new AppError("Current custody holder does not match requested handover flow", 409, {
      code: HANDOVER_ERRORS.INVALID_TRANSFER,
      errors: {
        currentHolderType: ticket.currentHolderType,
        expectedFrom,
      },
    });
  }
};

const resolveToHolder = async (businessId, ticket, payload, expectedTo) => {
  if (expectedTo === CUSTODY_HOLDER_TYPES.TECHNICIAN) {
    const staffId = payload.toHolderId;

    if (!staffId) {
      throw new AppError("Technician handover requires target technician", 400, {
        code: HANDOVER_ERRORS.INVALID_HOLDER,
      });
    }

    const staff = await handoverRepository.findStaff(businessId, staffId, ticket.branchId);

    if (!staff || staff.role !== ROLES.TECHNICIAN) {
      throw new AppError("Target technician was not found", 404, {
        code: HANDOVER_ERRORS.STAFF_NOT_FOUND,
      });
    }

    return staff.id;
  }

  if (expectedTo === CUSTODY_HOLDER_TYPES.VENDOR) {
    const vendorId = payload.vendorId || payload.toHolderId || ticket.vendorId;

    if (!vendorId) {
      throw new AppError("Vendor handover requires vendor", 400, {
        code: HANDOVER_ERRORS.INVALID_HOLDER,
      });
    }

    const vendor = await handoverRepository.findVendor(businessId, vendorId);

    if (!vendor) {
      throw new AppError("Vendor was not found", 404, {
        code: HANDOVER_ERRORS.VENDOR_NOT_FOUND,
      });
    }

    return vendor.id;
  }

  if (expectedTo === CUSTODY_HOLDER_TYPES.CUSTOMER) {
    return payload.toHolderId || ticket.customerId;
  }

  return payload.toHolderId || null;
};

const assertRoleCanPerformTransfer = async (user, ticketId, payload, expectedFrom, expectedTo) => {
  if (canOverride(user)) {
    return;
  }

  if (user.role === ROLES.TECHNICIAN) {
    const touchesTechnician =
      expectedFrom === CUSTODY_HOLDER_TYPES.TECHNICIAN ||
      expectedTo === CUSTODY_HOLDER_TYPES.TECHNICIAN ||
      expectedTo === CUSTODY_HOLDER_TYPES.VENDOR;

    if (!touchesTechnician) {
      throw new AppError("Technician cannot perform this handover type", 403, {
        code: HANDOVER_ERRORS.INVALID_TRANSFER,
      });
    }

    const assigned = await handoverRepository.isTechnicianAssigned(
      user.businessId,
      ticketId,
      user.staffId,
      user.branchId
    );

    if (!assigned) {
      throw new AppError("Only the assigned technician can hand over this repair", 403, {
        code: HANDOVER_ERRORS.NOT_ASSIGNED_TECHNICIAN,
      });
    }

  }
};

const resolveWorkflowTransition = (ticket, payload) => {
  if (
    payload.type === HANDOVER_TYPES.RECEPTION_TO_TECHNICIAN &&
    ticket.status === TICKET_STATUSES.RECEIVED
  ) {
    assertCanTransition(TICKET_STATUSES.RECEIVED, TICKET_STATUSES.DIAGNOSING);
    return {
      fromStatus: TICKET_STATUSES.RECEIVED,
      toStatus: TICKET_STATUSES.DIAGNOSING,
      reason: "Custody moved from reception to technician",
    };
  }

  if (payload.type === HANDOVER_TYPES.TECHNICIAN_TO_VENDOR) {
    assertCanTransition(ticket.status, TICKET_STATUSES.SENT_TO_VENDOR);
    return {
      fromStatus: ticket.status,
      toStatus: TICKET_STATUSES.SENT_TO_VENDOR,
      reason: "Custody moved from technician to vendor",
    };
  }

  if (
    payload.type === HANDOVER_TYPES.VENDOR_TO_RECEPTION &&
    ticket.status === TICKET_STATUSES.SENT_TO_VENDOR
  ) {
    assertCanTransition(TICKET_STATUSES.SENT_TO_VENDOR, TICKET_STATUSES.IN_REPAIR);
    return {
      fromStatus: TICKET_STATUSES.SENT_TO_VENDOR,
      toStatus: TICKET_STATUSES.IN_REPAIR,
      reason: "Custody returned from vendor to reception",
    };
  }

  if (
    payload.type === HANDOVER_TYPES.RECEPTION_TO_CUSTOMER &&
    ticket.status === TICKET_STATUSES.READY_FOR_DELIVERY
  ) {
    assertCanTransition(TICKET_STATUSES.READY_FOR_DELIVERY, TICKET_STATUSES.DELIVERED);
    return {
      fromStatus: TICKET_STATUSES.READY_FOR_DELIVERY,
      toStatus: TICKET_STATUSES.DELIVERED,
      reason: "Device delivered to customer",
    };
  }

  if (
    payload.type === HANDOVER_TYPES.RECEPTION_TO_CUSTOMER &&
    ticket.status === TICKET_STATUSES.IN_REPAIR
  ) {
    assertCanTransition(TICKET_STATUSES.IN_REPAIR, TICKET_STATUSES.READY_FOR_DELIVERY);
    assertCanTransition(TICKET_STATUSES.READY_FOR_DELIVERY, TICKET_STATUSES.DELIVERED);

    return [
      {
        fromStatus: TICKET_STATUSES.IN_REPAIR,
        toStatus: TICKET_STATUSES.READY_FOR_DELIVERY,
        reason: "Repair completed during customer handover",
      },
      {
        fromStatus: TICKET_STATUSES.READY_FOR_DELIVERY,
        toStatus: TICKET_STATUSES.DELIVERED,
        reason: "Device delivered to customer",
      },
    ];
  }

  return null;
};

const resolveActivityTechnician = (user, ticket, expectedFrom, expectedTo, toHolderId) => {
  if (user.role === ROLES.TECHNICIAN) {
    return user.staffId;
  }

  if (expectedFrom === CUSTODY_HOLDER_TYPES.TECHNICIAN) {
    return ticket.currentHolderId;
  }

  if (expectedTo === CUSTODY_HOLDER_TYPES.TECHNICIAN) {
    return toHolderId;
  }

  return null;
};

const createHandover = async (user, ticketId, payload) => {
  const branchFilter = await resolveBranchFilter(user, payload);
  const ticket = await handoverRepository.findTicket(user.businessId, ticketId, branchFilter);

  if (!ticket) {
    throw new AppError("Repair ticket not found", 404, {
      code: HANDOVER_ERRORS.TICKET_NOT_FOUND,
    });
  }

  const expected = getExpectedTransfer(payload);

  assertHolderMatchesCurrentCustody(ticket, expected.from, user);
  await assertRoleCanPerformTransfer(user, ticketId, payload, expected.from, expected.to);

  const toHolderId = await resolveToHolder(user.businessId, ticket, payload, expected.to);
  const workflowTransition = resolveWorkflowTransition(ticket, payload);
  const workflowTransitions = Array.isArray(workflowTransition)
    ? workflowTransition
    : workflowTransition
      ? [workflowTransition]
      : [];
  const activityTechnicianId = resolveActivityTechnician(
    user,
    ticket,
    expected.from,
    expected.to,
    toHolderId
  );

  const result = await handoverRepository.createHandover({
    businessId: user.businessId,
    branchFilter,
    ticketId,
    actorStaffId: user.staffId,
    workflowTransitions,
    activityTechnicianId,
    transfer: {
      type: payload.type,
      vendorId: expected.to === CUSTODY_HOLDER_TYPES.VENDOR ? toHolderId : payload.vendorId,
      fromHolderType: ticket.currentHolderType || expected.from || CUSTODY_HOLDER_TYPES.RECEPTION,
      fromHolderId: ticket.currentHolderId,
      toHolderType: expected.to,
      toHolderId,
      currentLocation: payload.currentLocation,
      receiverName: payload.receiverName,
      verificationToken: payload.verificationToken,
      notes: payload.notes,
      metadata: {
        ...(payload.metadata || {}),
        previousTicketStatus: ticket.status,
        workflowTransitions,
      },
    },
  });

  if (result.outcome !== "CREATED") {
    throw mapOutcomeToError(result.outcome);
  }

  return {
    ticket: result.ticket,
    handover: result.handover,
    ticketStatus: result.ticketStatus,
  };
};

const getTicketHandovers = async (user, ticketId) => {
  const branchFilter = await resolveBranchFilter(user);
  const result = await handoverRepository.listTicketHandovers(user.businessId, ticketId, branchFilter);

  if (!result) {
    throw new AppError("Repair ticket not found", 404, {
      code: HANDOVER_ERRORS.TICKET_NOT_FOUND,
    });
  }

  return result;
};

const getCurrentCustody = async (user, ticketId) => {
  const branchFilter = await resolveBranchFilter(user);
  const ticket = await handoverRepository.findTicket(user.businessId, ticketId, branchFilter);

  if (!ticket) {
    throw new AppError("Repair ticket not found", 404, {
      code: HANDOVER_ERRORS.TICKET_NOT_FOUND,
    });
  }

  return {
    ticket,
    custody: {
      currentHolderType: ticket.currentHolderType,
      currentHolderId: ticket.currentHolderId,
      currentLocation: ticket.currentLocation,
      lastHandoverAt: ticket.lastHandoverAt,
    },
  };
};

module.exports = {
  createHandover,
  getTicketHandovers,
  getCurrentCustody,
};
