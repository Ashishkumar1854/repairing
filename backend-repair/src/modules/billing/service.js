const crypto = require("crypto");

const AppError = require("../../shared/errors/AppError");
const { resolveBranchFilter } = require("../../shared/utils/branchScope");
const { TICKET_STATUSES } = require("../repair/constants");
const { assertCanTransition } = require("../repair/workflow");
const billingRepository = require("./repository");
const {
  BILLING_ERRORS,
  INVOICE_ITEM_SOURCE_TYPES,
} = require("./constants");

const toNumber = (value) => Number(value || 0);
const toDecimalString = (value) => Number(value || 0).toFixed(2);

const generateInvoiceNumber = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `INV-${datePart}-${timePart}-${suffix}`;
};

const createInvoiceItem = ({ itemType, sourceType, sourceRefId, name, description, quantity, unitPrice, metadata }) => {
  const qty = toNumber(quantity);
  const price = toNumber(unitPrice);

  return {
    itemType,
    sourceType,
    sourceRefId,
    name,
    description,
    quantity: toDecimalString(qty),
    unitPrice: toDecimalString(price),
    totalAmount: toDecimalString(qty * price),
    metadata,
  };
};

const buildInvoiceItems = (ticket, payload) => {
  const items = [];
  const approvedEstimate = ticket.estimates[0];

  if (payload.includeApprovedEstimate && approvedEstimate) {
    for (const item of approvedEstimate.items) {
      items.push(
        createInvoiceItem({
          itemType: item.itemType,
          sourceType: item.itemType === "LABOR" ? INVOICE_ITEM_SOURCE_TYPES.LABOR : INVOICE_ITEM_SOURCE_TYPES.ESTIMATE,
          sourceRefId: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitAmount,
          metadata: {
            ...(item.metadata || {}),
            estimateId: approvedEstimate.id,
            estimateNumber: approvedEstimate.estimateNumber,
          },
        })
      );
    }
  }

  if (payload.includeActualUsage) {
    for (const usage of ticket.partsUsage) {
      const quantity = toNumber(usage.quantity);
      const unitPrice =
        quantity > 0 && usage.totalCost !== null && usage.totalCost !== undefined
          ? toNumber(usage.totalCost) / quantity
          : toNumber(usage.unitCost);

      items.push(
        createInvoiceItem({
          itemType: "PART",
          sourceType: INVOICE_ITEM_SOURCE_TYPES.ACTUAL_USAGE,
          sourceRefId: usage.id,
          name: usage.partName,
          description: usage.notes,
          quantity,
          unitPrice,
          metadata: {
            ...(usage.metadata || {}),
            partSku: usage.partSku,
            sourceCostSnapshot: true,
          },
        })
      );
    }
  }

  for (const item of payload.manualItems || []) {
    items.push(
      createInvoiceItem({
        itemType: item.itemType,
        sourceType: item.sourceType,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        metadata: item.metadata,
      })
    );
  }

  return items;
};

const calculateInvoiceTotals = (items, discountAmount, taxRate) => {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.totalAmount), 0);
  const discount = toNumber(discountAmount);

  if (discount > subtotal) {
    throw new AppError("Discount cannot exceed invoice subtotal", 400, {
      code: BILLING_ERRORS.PAYMENT_AMOUNT_INVALID,
    });
  }

  const taxableAmount = subtotal - discount;
  const taxAmount = taxableAmount * (toNumber(taxRate) / 100);
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotalAmount: toDecimalString(subtotal),
    discountAmount: toDecimalString(discount),
    taxAmount: toDecimalString(taxAmount),
    totalAmount: toDecimalString(totalAmount),
  };
};

const mapRepositoryOutcome = (outcome) => {
  const errorMap = {
    TICKET_NOT_FOUND: ["Repair ticket not found", 404, BILLING_ERRORS.TICKET_NOT_FOUND],
    INVOICE_NOT_FOUND: ["Invoice not found", 404, BILLING_ERRORS.INVOICE_NOT_FOUND],
    INVALID_INVOICE_STATUS: ["Invoice status does not allow this operation", 409, BILLING_ERRORS.INVALID_INVOICE_STATUS],
    PAYMENT_EXCEEDS_DUE: ["Payment amount exceeds invoice due amount", 409, BILLING_ERRORS.PAYMENT_EXCEEDS_DUE],
  };

  const [message, statusCode, code] = errorMap[outcome] || ["Billing operation failed", 500, outcome];

  return new AppError(message, statusCode, { code });
};

const generateInvoice = async (user, ticketId, payload) => {
  const branchFilter = await resolveBranchFilter(user, payload);
  const ticket = await billingRepository.findTicketBillingContext({
    businessId: user.businessId,
    branchFilter,
    ticketId,
    estimateId: payload.estimateId,
  });

  if (!ticket) {
    throw new AppError("Repair ticket not found", 404, {
      code: BILLING_ERRORS.TICKET_NOT_FOUND,
    });
  }

  const approvedEstimate = ticket.estimates[0];

  if (payload.estimateId && !approvedEstimate) {
    throw new AppError("Approved estimate not found for this repair ticket", 404, {
      code: BILLING_ERRORS.ESTIMATE_NOT_FOUND,
    });
  }

  const items = buildInvoiceItems(ticket, payload);

  if (items.length === 0) {
    throw new AppError("Invoice requires at least one billable line item", 400, {
      code: BILLING_ERRORS.INVOICE_ITEM_REQUIRED,
    });
  }

  const totals = calculateInvoiceTotals(items, payload.discountAmount, payload.taxRate);

  const result = await billingRepository.createInvoice({
    businessId: user.businessId,
    actorStaffId: user.staffId,
    ticket,
    invoiceNumber: generateInvoiceNumber(),
    estimateId: approvedEstimate?.id || null,
    items,
    ...totals,
    dueDate: payload.dueDate,
    notes: payload.notes,
    metadata: {
      ...(payload.metadata || {}),
      taxRate: payload.taxRate,
      source: {
        approvedEstimate: Boolean(approvedEstimate && payload.includeApprovedEstimate),
        actualUsage: Boolean(payload.includeActualUsage),
        manualItemCount: payload.manualItems?.length || 0,
      },
    },
  });

  if (result.outcome !== "CREATED") {
    throw mapRepositoryOutcome(result.outcome);
  }

  return {
    invoice: result.invoice,
  };
};

const listInvoices = async (user, query) => {
  const branchFilter = await resolveBranchFilter(user, query);
  const { invoices, total } = await billingRepository.listInvoices({
    businessId: user.businessId,
    branchFilter,
    page: query.page,
    limit: query.limit,
    status: query.status,
    customerId: query.customerId,
    repairTicketId: query.repairTicketId,
    search: query.search,
  });

  return {
    invoices,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

const getInvoice = async (user, invoiceId) => {
  const branchFilter = await resolveBranchFilter(user);
  const invoice = await billingRepository.findInvoiceById(user.businessId, invoiceId, branchFilter);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, {
      code: BILLING_ERRORS.INVOICE_NOT_FOUND,
    });
  }

  return {
    invoice,
  };
};

const collectPayment = async (user, invoiceId, payload) => {
  const branchFilter = await resolveBranchFilter(user, payload);
  const invoice = await billingRepository.findInvoiceById(user.businessId, invoiceId, branchFilter);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, {
      code: BILLING_ERRORS.INVOICE_NOT_FOUND,
    });
  }

  if (toNumber(payload.amount) <= 0) {
    throw new AppError("Payment amount must be greater than zero", 400, {
      code: BILLING_ERRORS.PAYMENT_AMOUNT_INVALID,
    });
  }

  if (toNumber(payload.amount) > toNumber(invoice.dueAmount)) {
    throw new AppError("Payment amount exceeds invoice due amount", 409, {
      code: BILLING_ERRORS.PAYMENT_EXCEEDS_DUE,
    });
  }

  const deliverIfReady = invoice.ticket.status === TICKET_STATUSES.READY_FOR_DELIVERY;

  if (deliverIfReady && toNumber(payload.amount) === toNumber(invoice.dueAmount)) {
    assertCanTransition(TICKET_STATUSES.READY_FOR_DELIVERY, TICKET_STATUSES.DELIVERED);
  }

  const result = await billingRepository.collectPayment({
    businessId: user.businessId,
    branchFilter,
    invoiceId,
    actorStaffId: user.staffId,
    amount: toDecimalString(payload.amount),
    method: payload.method,
    transactionReference: payload.transactionReference,
    notes: payload.notes,
    metadata: payload.metadata,
    deliverIfReady,
  });

  if (result.outcome !== "PAID") {
    throw mapRepositoryOutcome(result.outcome);
  }

  return {
    invoice: result.invoice,
    payment: result.payment,
  };
};

const getCustomerLedger = async (user, customerId, query) => {
  const branchFilter = await resolveBranchFilter(user, query);
  const { customer, entries, total } = await billingRepository.getCustomerLedger({
    businessId: user.businessId,
    branchFilter,
    customerId,
    page: query.page,
    limit: query.limit,
  });

  if (!customer) {
    throw new AppError("Customer not found", 404, {
      code: "CUSTOMER_NOT_FOUND",
    });
  }

  return {
    customer,
    entries,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

module.exports = {
  generateInvoice,
  listInvoices,
  getInvoice,
  collectPayment,
  getCustomerLedger,
};
