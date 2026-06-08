const crypto = require("crypto");

const AppError = require("../../../shared/errors/AppError");
const estimatesRepository = require("./repository");
const {
  ESTIMATE_STATUSES,
  ESTIMATE_ITEM_TYPES,
  ESTIMATE_ERRORS,
} = require("./constants");
const { TICKET_STATUSES } = require("../constants");
const { assertCanTransition } = require("../workflow");

const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => (value / 100).toFixed(2);

const generateEstimateNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `EST-${datePart}-${suffix}`;
};

const isLaborType = (itemType) =>
  [ESTIMATE_ITEM_TYPES.LABOR, ESTIMATE_ITEM_TYPES.SERVICE].includes(itemType);

const calculateEstimateTotals = ({ items, discountAmount, taxRate }) => {
  const calculatedItems = items.map((item) => {
    const quantityBasis = Math.round(Number(item.quantity) * 100);
    const unitAmountCents = toCents(item.unitAmount);
    const totalCents = Math.round((quantityBasis * unitAmountCents) / 100);

    return {
      ...item,
      quantity: Number(item.quantity).toFixed(2),
      unitAmount: fromCents(unitAmountCents),
      totalAmount: fromCents(totalCents),
      totalCents,
    };
  });

  const subtotalCents = calculatedItems.reduce((sum, item) => sum + item.totalCents, 0);
  const laborCents = calculatedItems
    .filter((item) => isLaborType(item.itemType))
    .reduce((sum, item) => sum + item.totalCents, 0);
  const partsCents = subtotalCents - laborCents;
  const discountCents = Math.min(toCents(discountAmount), subtotalCents);
  const taxableCents = Math.max(subtotalCents - discountCents, 0);
  const taxCents = Math.round((taxableCents * Number(taxRate || 0)) / 100);
  const totalCents = taxableCents + taxCents;

  return {
    items: calculatedItems.map(({ totalCents: _totalCents, ...item }) => item),
    subtotalAmount: fromCents(subtotalCents),
    laborAmount: fromCents(laborCents),
    partsAmount: fromCents(partsCents),
    discountAmount: fromCents(discountCents),
    taxAmount: fromCents(taxCents),
    totalAmount: fromCents(totalCents),
  };
};

const buildEstimateCreationTransitions = (currentStatus) => {
  if (currentStatus === TICKET_STATUSES.DIAGNOSING) {
    assertCanTransition(TICKET_STATUSES.DIAGNOSING, TICKET_STATUSES.ESTIMATE_PENDING);
    assertCanTransition(TICKET_STATUSES.ESTIMATE_PENDING, TICKET_STATUSES.WAITING_APPROVAL);

    return [
      {
        toStatus: TICKET_STATUSES.ESTIMATE_PENDING,
        reason: "Diagnosis completed and estimate generated",
        metadata: {
          source: "estimate_creation",
        },
      },
      {
        toStatus: TICKET_STATUSES.WAITING_APPROVAL,
        reason: "Estimate awaiting customer approval",
        metadata: {
          source: "estimate_creation",
        },
      },
    ];
  }

  if (currentStatus === TICKET_STATUSES.ESTIMATE_PENDING) {
    assertCanTransition(TICKET_STATUSES.ESTIMATE_PENDING, TICKET_STATUSES.WAITING_APPROVAL);

    return [
      {
        toStatus: TICKET_STATUSES.WAITING_APPROVAL,
        reason: "Estimate awaiting customer approval",
        metadata: {
          source: "estimate_creation",
        },
      },
    ];
  }

  if (currentStatus === TICKET_STATUSES.WAITING_APPROVAL) {
    return [];
  }

  throw new AppError("Ticket is not in a valid status for estimate creation", 409, {
    code: ESTIMATE_ERRORS.INVALID_TICKET_STATUS,
    errors: {
      currentStatus,
      allowedStatuses: [
        TICKET_STATUSES.DIAGNOSING,
        TICKET_STATUSES.ESTIMATE_PENDING,
        TICKET_STATUSES.WAITING_APPROVAL,
      ],
    },
  });
};

const createEstimate = async (user, ticketId, payload) => {
  const ticket = await estimatesRepository.findTicketForEstimate(user.businessId, ticketId);

  if (!ticket) {
    throw new AppError("Repair ticket not found", 404, {
      code: ESTIMATE_ERRORS.TICKET_NOT_FOUND,
    });
  }

  const workflowTransitions = buildEstimateCreationTransitions(ticket.status);
  const totals = calculateEstimateTotals(payload);

  const result = await estimatesRepository.createEstimateWithWorkflow({
    businessId: user.businessId,
    ticketId,
    actorStaffId: user.staffId,
    estimateNumber: generateEstimateNumber(),
    diagnosis: payload.diagnosis,
    technicianNotes: payload.technicianNotes || [],
    workflowTransitions,
    estimate: {
      status: ESTIMATE_STATUSES.PENDING,
      ...totals,
      validUntil: payload.validUntil,
      notes: payload.notes,
      metadata: {
        ...(payload.metadata || {}),
        taxRate: Number(payload.taxRate || 0),
        calculationSource: "backend",
      },
    },
  });

  if (result.outcome === "WORKFLOW_CONFLICT") {
    throw new AppError("Ticket workflow changed while creating estimate", 409, {
      code: ESTIMATE_ERRORS.WORKFLOW_CONFLICT,
    });
  }

  if (result.outcome === "TICKET_NOT_FOUND") {
    throw new AppError("Repair ticket not found", 404, {
      code: ESTIMATE_ERRORS.TICKET_NOT_FOUND,
    });
  }

  return {
    estimate: result.estimate,
  };
};

const getEstimate = async (user, estimateId) => {
  const estimate = await estimatesRepository.findEstimateById(user.businessId, estimateId);

  if (!estimate) {
    throw new AppError("Repair estimate not found", 404, {
      code: ESTIMATE_ERRORS.ESTIMATE_NOT_FOUND,
    });
  }

  return {
    estimate,
  };
};

const assertEstimatePending = (estimate) => {
  if (![ESTIMATE_STATUSES.PENDING, ESTIMATE_STATUSES.DRAFT, ESTIMATE_STATUSES.SENT].includes(estimate.status)) {
    throw new AppError("Estimate is already finalized", 409, {
      code: ESTIMATE_ERRORS.ESTIMATE_ALREADY_FINALIZED,
      errors: {
        currentStatus: estimate.status,
      },
    });
  }
};

const approveEstimate = async (user, estimateId, payload) => {
  const estimate = await estimatesRepository.findEstimateById(user.businessId, estimateId);

  if (!estimate) {
    throw new AppError("Repair estimate not found", 404, {
      code: ESTIMATE_ERRORS.ESTIMATE_NOT_FOUND,
    });
  }

  assertEstimatePending(estimate);

  if (estimate.validUntil && estimate.validUntil.getTime() < Date.now()) {
    throw new AppError("Estimate approval window has expired", 409, {
      code: ESTIMATE_ERRORS.ESTIMATE_EXPIRED,
    });
  }

  assertCanTransition(estimate.ticket.status, TICKET_STATUSES.APPROVED);

  const result = await estimatesRepository.approveEstimate({
    businessId: user.businessId,
    estimateId,
    actorStaffId: user.staffId,
    previousStatus: estimate.status,
    notes: payload.notes,
    metadata: payload.metadata,
    workflowTransition: {
      fromStatus: estimate.ticket.status,
      toStatus: TICKET_STATUSES.APPROVED,
    },
  });

  if (result.outcome === "WORKFLOW_CONFLICT" || result.outcome === "ESTIMATE_STATUS_CONFLICT") {
    throw new AppError("Estimate approval state changed while processing request", 409, {
      code: ESTIMATE_ERRORS.WORKFLOW_CONFLICT,
    });
  }

  return {
    estimate: result.estimate,
  };
};

const rejectEstimate = async (user, estimateId, payload) => {
  const estimate = await estimatesRepository.findEstimateById(user.businessId, estimateId);

  if (!estimate) {
    throw new AppError("Repair estimate not found", 404, {
      code: ESTIMATE_ERRORS.ESTIMATE_NOT_FOUND,
    });
  }

  assertEstimatePending(estimate);
  assertCanTransition(estimate.ticket.status, TICKET_STATUSES.CANCELLED);

  const result = await estimatesRepository.rejectEstimate({
    businessId: user.businessId,
    estimateId,
    actorStaffId: user.staffId,
    previousStatus: estimate.status,
    notes: payload.notes,
    metadata: payload.metadata,
    workflowTransition: {
      fromStatus: estimate.ticket.status,
      toStatus: TICKET_STATUSES.CANCELLED,
    },
  });

  if (result.outcome === "WORKFLOW_CONFLICT" || result.outcome === "ESTIMATE_STATUS_CONFLICT") {
    throw new AppError("Estimate rejection state changed while processing request", 409, {
      code: ESTIMATE_ERRORS.WORKFLOW_CONFLICT,
    });
  }

  return {
    estimate: result.estimate,
  };
};

module.exports = {
  createEstimate,
  getEstimate,
  approveEstimate,
  rejectEstimate,
  calculateEstimateTotals,
};
