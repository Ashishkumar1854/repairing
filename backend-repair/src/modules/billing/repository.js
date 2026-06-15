const prisma = require("../../core/database/prisma");
const { TICKET_STATUSES } = require("../repair/constants");
const {
  FINANCIAL_AUDIT_ACTIONS,
  INVOICE_STATUSES,
  LEDGER_ENTRY_TYPES,
  PAYMENT_STATUSES,
} = require("./constants");

const staffSelect = {
  id: true,
  fullName: true,
  role: true,
};

const invoiceItemSelect = {
  id: true,
  itemType: true,
  sourceType: true,
  sourceRefId: true,
  name: true,
  description: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  metadata: true,
  createdAt: true,
};

const paymentSelect = {
  id: true,
  amount: true,
  status: true,
  method: true,
  transactionReference: true,
  collectedAt: true,
  notes: true,
  metadata: true,
  createdAt: true,
  collectedBy: {
    select: staffSelect,
  },
};

const auditSelect = {
  id: true,
  action: true,
  previousStatus: true,
  nextStatus: true,
  notes: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: staffSelect,
  },
};

const invoiceSelect = {
  id: true,
  businessId: true,
  branchId: true,
  repairTicketId: true,
  customerId: true,
  estimateId: true,
  invoiceNumber: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  taxAmount: true,
  totalAmount: true,
  paidAmount: true,
  dueAmount: true,
  issuedAt: true,
  dueDate: true,
  notes: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  ticket: {
    select: {
      id: true,
      branchId: true,
      ticketNumber: true,
      title: true,
      status: true,
      priority: true,
      paymentStatus: true,
    },
  },
  customer: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
    },
  },
  estimate: {
    select: {
      id: true,
      estimateNumber: true,
      status: true,
      totalAmount: true,
    },
  },
  issuedBy: {
    select: staffSelect,
  },
  items: {
    select: invoiceItemSelect,
    orderBy: {
      createdAt: "asc",
    },
  },
  payments: {
    where: {
      deletedAt: null,
    },
    select: paymentSelect,
    orderBy: {
      createdAt: "desc",
    },
  },
  auditLogs: {
    select: auditSelect,
    orderBy: {
      createdAt: "desc",
    },
  },
};

const listInvoiceSelect = {
  id: true,
  branchId: true,
  invoiceNumber: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  taxAmount: true,
  totalAmount: true,
  paidAmount: true,
  dueAmount: true,
  issuedAt: true,
  dueDate: true,
  ticket: {
    select: {
      id: true,
      branchId: true,
      ticketNumber: true,
      title: true,
      status: true,
    },
  },
  customer: {
    select: {
      id: true,
      fullName: true,
      phone: true,
    },
  },
};

const ledgerSelect = {
  id: true,
  branchId: true,
  type: true,
  debitAmount: true,
  creditAmount: true,
  runningBalance: true,
  referenceType: true,
  referenceId: true,
  notes: true,
  metadata: true,
  createdAt: true,
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
    },
  },
  payment: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      collectedAt: true,
    },
  },
  actor: {
    select: staffSelect,
  },
};

const toNumber = (value) => Number(value || 0);
const toDecimalString = (value) => Number(value || 0).toFixed(2);

const getLastCustomerLedgerBalance = async (tx, businessId, branchId, customerId) => {
  const lastEntry = await tx.customerFinancialLedger.findFirst({
    where: {
      businessId,
      branchId,
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      runningBalance: true,
    },
  });

  return toNumber(lastEntry?.runningBalance);
};

const findTicketBillingContext = ({ businessId, branchFilter = {}, ticketId, estimateId }) =>
  prisma.repairTicket.findFirst({
    where: {
      id: ticketId,
      businessId,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      deletedAt: null,
    },
    select: {
      id: true,
      businessId: true,
      branchId: true,
      customerId: true,
      ticketNumber: true,
      title: true,
      status: true,
      paymentStatus: true,
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
      estimates: {
        where: {
          businessId,
          ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
          deletedAt: null,
          status: "APPROVED",
          ...(estimateId ? { id: estimateId } : {}),
        },
        orderBy: {
          approvedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          estimateNumber: true,
          status: true,
          subtotalAmount: true,
          discountAmount: true,
          taxAmount: true,
          totalAmount: true,
          items: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              itemType: true,
              name: true,
              description: true,
              quantity: true,
              unitAmount: true,
              totalAmount: true,
              metadata: true,
            },
          },
        },
      },
      partsUsage: {
        where: {
          businessId,
          ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
          deletedAt: null,
        },
        select: {
          id: true,
          partName: true,
          partSku: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          notes: true,
          metadata: true,
        },
        orderBy: {
          usedAt: "asc",
        },
      },
    },
  });

const createInvoice = ({
  businessId,
  actorStaffId,
  ticket,
  invoiceNumber,
  estimateId,
  items,
  subtotalAmount,
  discountAmount,
  taxAmount,
  totalAmount,
  dueDate,
  notes,
  metadata,
}) =>
  prisma.$transaction(async (tx) => {
    const existingTicket = await tx.repairTicket.findFirst({
      where: {
        id: ticket.id,
        businessId,
        branchId: ticket.branchId,
        deletedAt: null,
      },
      select: {
        id: true,
        branchId: true,
        customerId: true,
      },
    });

    if (!existingTicket) {
      return { outcome: "TICKET_NOT_FOUND" };
    }

    const invoice = await tx.repairInvoice.create({
      data: {
        businessId,
        branchId: existingTicket.branchId,
        repairTicketId: ticket.id,
        customerId: ticket.customerId,
        estimateId,
        issuedByStaffId: actorStaffId,
        invoiceNumber,
        status: INVOICE_STATUSES.ISSUED,
        subtotalAmount,
        discountAmount,
        taxAmount,
        totalAmount,
        paidAmount: "0.00",
        dueAmount: totalAmount,
        dueDate,
        notes,
        metadata,
        items: {
          create: items.map((item) => ({
            businessId,
            itemType: item.itemType,
            sourceType: item.sourceType,
            sourceRefId: item.sourceRefId,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
            metadata: item.metadata,
          })),
        },
      },
      select: {
        id: true,
      },
    });

    const ticketDetails = await tx.repairTicket.findFirst({
      where: {
        id: ticket.id,
        businessId,
      },
      select: {
        laborCost: true,
        partsCost: true,
        vendorCost: true,
      },
    });

    if (ticketDetails) {
      const laborCost = toNumber(ticketDetails.laborCost);
      const partsCost = toNumber(ticketDetails.partsCost);
      const vendorCost = toNumber(ticketDetails.vendorCost);
      const finalInvoiceAmountVal = toNumber(totalAmount);
      const profitEstimate = finalInvoiceAmountVal - laborCost - partsCost - vendorCost;

      await tx.repairTicket.update({
        where: {
          id: ticket.id,
        },
        data: {
          finalInvoiceAmount: toDecimalString(finalInvoiceAmountVal),
          profitEstimate: toDecimalString(profitEstimate),
        },
      });
    }

    const previousBalance = await getLastCustomerLedgerBalance(tx, businessId, existingTicket.branchId, ticket.customerId);
    const runningBalance = previousBalance + toNumber(totalAmount);

    await tx.customerFinancialLedger.create({
      data: {
        businessId,
        branchId: existingTicket.branchId,
        customerId: ticket.customerId,
        repairInvoiceId: invoice.id,
        actorStaffId,
        type: LEDGER_ENTRY_TYPES.INVOICE_ISSUED,
        debitAmount: totalAmount,
        creditAmount: "0.00",
        runningBalance: toDecimalString(runningBalance),
        referenceType: "REPAIR_INVOICE",
        referenceId: invoice.id,
        notes: "Invoice issued",
        metadata,
      },
    });

    await tx.repairFinancialAuditLog.createMany({
      data: [
        {
          businessId,
          branchId: existingTicket.branchId,
          repairInvoiceId: invoice.id,
          actorStaffId,
          action: FINANCIAL_AUDIT_ACTIONS.INVOICE_CREATED,
          previousStatus: null,
          nextStatus: INVOICE_STATUSES.ISSUED,
          notes,
          metadata: {
            subtotalAmount,
            discountAmount,
            taxAmount,
            totalAmount,
          },
        },
        {
          businessId,
          branchId: existingTicket.branchId,
          repairInvoiceId: invoice.id,
          actorStaffId,
          action: FINANCIAL_AUDIT_ACTIONS.INVOICE_ISSUED,
          previousStatus: null,
          nextStatus: INVOICE_STATUSES.ISSUED,
          notes,
          metadata,
        },
      ],
    });

    const hydratedInvoice = await tx.repairInvoice.findFirst({
      where: {
        id: invoice.id,
        businessId,
        branchId: existingTicket.branchId,
      },
      select: invoiceSelect,
    });

    return {
      outcome: "CREATED",
      invoice: hydratedInvoice,
    };
  });

const buildInvoiceWhere = ({ businessId, branchFilter = {}, status, customerId, repairTicketId, search }) => {
  const where = {
    businessId,
    ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
    deletedAt: null,
  };

  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (repairTicketId) where.repairTicketId = repairTicketId;

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { ticket: { ticketNumber: { contains: search, mode: "insensitive" } } },
      { customer: { fullName: { contains: search, mode: "insensitive" } } },
      { customer: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
};

const listInvoices = async ({ businessId, branchFilter, page, limit, status, customerId, repairTicketId, search }) => {
  const where = buildInvoiceWhere({ businessId, branchFilter, status, customerId, repairTicketId, search });
  const skip = (page - 1) * limit;

  const [total, invoices] = await prisma.$transaction([
    prisma.repairInvoice.count({ where }),
    prisma.repairInvoice.findMany({
      where,
      select: listInvoiceSelect,
      orderBy: {
        issuedAt: "desc",
      },
      skip,
      take: limit,
    }),
  ]);

  return {
    invoices,
    total,
  };
};

const findInvoiceById = (businessId, invoiceId, branchFilter = {}) =>
  prisma.repairInvoice.findFirst({
    where: {
      id: invoiceId,
      businessId,
      ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
      deletedAt: null,
    },
    select: invoiceSelect,
  });

const collectPayment = ({
  businessId,
  invoiceId,
  actorStaffId,
  amount,
  method,
  transactionReference,
  notes,
  metadata,
  deliverIfReady,
  branchFilter = {},
}) =>
  prisma.$transaction(async (tx) => {
    const invoice = await tx.repairInvoice.findFirst({
      where: {
        id: invoiceId,
        businessId,
        ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}),
        deletedAt: null,
      },
      select: {
        id: true,
        branchId: true,
        repairTicketId: true,
        customerId: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        ticket: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!invoice) {
      return { outcome: "INVOICE_NOT_FOUND" };
    }

    if ([INVOICE_STATUSES.CANCELLED, INVOICE_STATUSES.REFUNDED, INVOICE_STATUSES.PAID].includes(invoice.status)) {
      return { outcome: "INVALID_INVOICE_STATUS" };
    }

    if (toNumber(amount) > toNumber(invoice.dueAmount)) {
      return { outcome: "PAYMENT_EXCEEDS_DUE" };
    }

    const paidAmount = toNumber(invoice.paidAmount) + toNumber(amount);
    const dueAmount = Math.max(toNumber(invoice.totalAmount) - paidAmount, 0);
    const nextInvoiceStatus = dueAmount === 0 ? INVOICE_STATUSES.PAID : INVOICE_STATUSES.PARTIALLY_PAID;
    const ticketPaymentStatus = dueAmount === 0 ? "PAID" : "PARTIAL";
    const collectedAt = new Date();

    const payment = await tx.repairPayment.create({
      data: {
        businessId,
        branchId: invoice.branchId,
        repairTicketId: invoice.repairTicketId,
        repairInvoiceId: invoice.id,
        collectedByStaffId: actorStaffId,
        amount,
        status: PAYMENT_STATUSES.COMPLETED,
        method,
        transactionReference,
        collectedAt,
        notes,
        metadata,
      },
      select: {
        id: true,
      },
    });

    await tx.repairInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        paidAmount: toDecimalString(paidAmount),
        dueAmount: toDecimalString(dueAmount),
        status: nextInvoiceStatus,
      },
    });

    await tx.repairTicket.updateMany({
      where: {
        id: invoice.repairTicketId,
        businessId,
        branchId: invoice.branchId,
        deletedAt: null,
      },
      data: {
        paymentStatus: ticketPaymentStatus,
      },
    });

    const previousBalance = await getLastCustomerLedgerBalance(tx, businessId, invoice.branchId, invoice.customerId);
    const runningBalance = previousBalance - toNumber(amount);

    await tx.customerFinancialLedger.create({
      data: {
        businessId,
        branchId: invoice.branchId,
        customerId: invoice.customerId,
        repairInvoiceId: invoice.id,
        repairPaymentId: payment.id,
        actorStaffId,
        type: LEDGER_ENTRY_TYPES.PAYMENT_RECEIVED,
        debitAmount: "0.00",
        creditAmount: amount,
        runningBalance: toDecimalString(runningBalance),
        referenceType: "REPAIR_PAYMENT",
        referenceId: payment.id,
        notes: "Payment received",
        metadata,
      },
    });

    await tx.repairFinancialAuditLog.createMany({
      data: [
        {
          businessId,
          branchId: invoice.branchId,
          repairInvoiceId: invoice.id,
          repairPaymentId: payment.id,
          actorStaffId,
          action: FINANCIAL_AUDIT_ACTIONS.PAYMENT_COLLECTED,
          previousStatus: null,
          nextStatus: PAYMENT_STATUSES.COMPLETED,
          notes,
          metadata: {
            amount,
            method,
            transactionReference,
          },
        },
        {
          businessId,
          branchId: invoice.branchId,
          repairInvoiceId: invoice.id,
          repairPaymentId: payment.id,
          actorStaffId,
          action:
            nextInvoiceStatus === INVOICE_STATUSES.PAID
              ? FINANCIAL_AUDIT_ACTIONS.INVOICE_PAID
              : FINANCIAL_AUDIT_ACTIONS.INVOICE_PARTIALLY_PAID,
          previousStatus: invoice.status,
          nextStatus: nextInvoiceStatus,
          notes,
          metadata: {
            paidAmount: toDecimalString(paidAmount),
            dueAmount: toDecimalString(dueAmount),
          },
        },
      ],
    });

    if (deliverIfReady && nextInvoiceStatus === INVOICE_STATUSES.PAID) {
      const transitionResult = await tx.repairTicket.updateMany({
        where: {
          id: invoice.repairTicketId,
          businessId,
          branchId: invoice.branchId,
          status: TICKET_STATUSES.READY_FOR_DELIVERY,
          deletedAt: null,
        },
        data: {
          status: TICKET_STATUSES.DELIVERED,
        },
      });

      if (transitionResult.count === 1) {
        await tx.repairStatusLog.create({
          data: {
            businessId,
            repairTicketId: invoice.repairTicketId,
            actorStaffId,
            fromStatus: TICKET_STATUSES.READY_FOR_DELIVERY,
            toStatus: TICKET_STATUSES.DELIVERED,
            reason: "Invoice paid in full",
            metadata: {
              invoiceId: invoice.id,
              paymentId: payment.id,
            },
          },
        });
      }
    }

    const hydratedPayment = await tx.repairPayment.findFirst({
      where: {
        id: payment.id,
        businessId,
        branchId: invoice.branchId,
      },
      select: paymentSelect,
    });

    const hydratedInvoice = await tx.repairInvoice.findFirst({
      where: {
        id: invoice.id,
        businessId,
        branchId: invoice.branchId,
      },
      select: invoiceSelect,
    });

    return {
      outcome: "PAID",
      invoice: hydratedInvoice,
      payment: hydratedPayment,
    };
  });

const getCustomerLedger = async ({ businessId, branchFilter = {}, customerId, page, limit }) => {
  const skip = (page - 1) * limit;
  const branchWhere = branchFilter.branchId ? { branchId: branchFilter.branchId } : {};

  const [customer, total, entries] = await prisma.$transaction([
    prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId,
        ...branchWhere,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
      },
    }),
    prisma.customerFinancialLedger.count({
      where: {
        businessId,
        ...branchWhere,
        customerId,
      },
    }),
    prisma.customerFinancialLedger.findMany({
      where: {
        businessId,
        ...branchWhere,
        customerId,
      },
      select: ledgerSelect,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
  ]);

  return {
    customer,
    entries,
    total,
  };
};

module.exports = {
  findTicketBillingContext,
  createInvoice,
  listInvoices,
  findInvoiceById,
  collectPayment,
  getCustomerLedger,
};
