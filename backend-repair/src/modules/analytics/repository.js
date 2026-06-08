const prisma = require("../../core/database/prisma");

const completedStatuses = ["DELIVERED", "CLOSED"];
const activeStatuses = [
  "RECEIVED",
  "DIAGNOSING",
  "ESTIMATE_PENDING",
  "WAITING_APPROVAL",
  "APPROVED",
  "IN_REPAIR",
  "WAITING_PARTS",
  "SENT_TO_VENDOR",
  "READY_FOR_DELIVERY",
];

const toNumber = (value) => Number(value || 0);

const buildDateWhere = (field, dateRange) => {
  const range = {};

  if (dateRange.from) {
    range.gte = dateRange.from;
  }

  if (dateRange.to) {
    range.lte = dateRange.to;
  }

  return Object.keys(range).length ? { [field]: range } : {};
};

const sumField = async (model, where, field) => {
  const result = await prisma[model].aggregate({
    where,
    _sum: {
      [field]: true,
    },
  });

  return toNumber(result._sum[field]);
};

const countTickets = (businessId, dateRange, extraWhere = {}) =>
  prisma.repairTicket.count({
    where: {
      businessId,
      deletedAt: null,
      ...buildDateWhere("createdAt", dateRange),
      ...extraWhere,
    },
  });

const getRepairSummary = async (businessId, dateRange) => {
  const baseWhere = {
    businessId,
    deletedAt: null,
    ...buildDateWhere("createdAt", dateRange),
  };

  const [total, active, completed, cancelled, waitingApproval, waitingParts, overdue] =
    await prisma.$transaction([
      prisma.repairTicket.count({ where: baseWhere }),
      prisma.repairTicket.count({
        where: {
          ...baseWhere,
          status: { in: activeStatuses },
        },
      }),
      prisma.repairTicket.count({
        where: {
          ...baseWhere,
          status: { in: completedStatuses },
        },
      }),
      prisma.repairTicket.count({
        where: {
          ...baseWhere,
          status: "CANCELLED",
        },
      }),
      prisma.repairTicket.count({
        where: {
          ...baseWhere,
          status: "WAITING_APPROVAL",
        },
      }),
      prisma.repairTicket.count({
        where: {
          ...baseWhere,
          status: "WAITING_PARTS",
        },
      }),
      prisma.repairTicket.count({
        where: {
          ...baseWhere,
          dueAt: {
            lt: new Date(),
          },
          status: {
            notIn: ["DELIVERED", "CANCELLED", "CLOSED"],
          },
        },
      }),
    ]);

  return {
    total,
    active,
    completed,
    cancelled,
    waitingApproval,
    waitingParts,
    overdue,
    completionRate: total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2)),
  };
};

const getStatusBreakdown = (businessId, dateRange) =>
  prisma.repairTicket.groupBy({
    by: ["status"],
    where: {
      businessId,
      deletedAt: null,
      ...buildDateWhere("createdAt", dateRange),
    },
    _count: {
      _all: true,
    },
    orderBy: {
      status: "asc",
    },
  });

const getAverageTurnaroundHours = async (businessId, dateRange) => {
  const rows = await prisma.repairTicket.findMany({
    where: {
      businessId,
      deletedAt: null,
      closedAt: {
        not: null,
      },
      ...buildDateWhere("closedAt", dateRange),
    },
    select: {
      receivedAt: true,
      closedAt: true,
    },
  });

  if (!rows.length) {
    return 0;
  }

  const totalHours = rows.reduce(
    (sum, ticket) => sum + (ticket.closedAt.getTime() - ticket.receivedAt.getTime()) / 36e5,
    0
  );

  return Number((totalHours / rows.length).toFixed(2));
};

const getFinancialSummary = async (businessId, dateRange) => {
  const invoiceWhere = {
    businessId,
    deletedAt: null,
    ...buildDateWhere("issuedAt", dateRange),
  };
  const paymentWhere = {
    businessId,
    deletedAt: null,
    status: "COMPLETED",
    ...buildDateWhere("collectedAt", dateRange),
  };

  const [invoiceAgg, paymentAgg, invoiceCount, partialCount, methodDistribution] =
    await prisma.$transaction([
      prisma.repairInvoice.aggregate({
        where: invoiceWhere,
        _sum: {
          totalAmount: true,
          paidAmount: true,
          dueAmount: true,
        },
        _avg: {
          totalAmount: true,
        },
      }),
      prisma.repairPayment.aggregate({
        where: paymentWhere,
        _sum: {
          amount: true,
        },
      }),
      prisma.repairInvoice.count({ where: invoiceWhere }),
      prisma.repairInvoice.count({
        where: {
          ...invoiceWhere,
          status: "PARTIALLY_PAID",
        },
      }),
      prisma.repairPayment.groupBy({
        by: ["method"],
        where: paymentWhere,
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

  return {
    totalRevenue: toNumber(invoiceAgg._sum.totalAmount),
    collectedRevenue: toNumber(paymentAgg._sum.amount),
    outstandingDues: toNumber(invoiceAgg._sum.dueAmount),
    averageInvoiceValue: toNumber(invoiceAgg._avg.totalAmount),
    invoiceCount,
    partialPaymentCount: partialCount,
    paymentMethodDistribution: methodDistribution.map((row) => ({
      method: row.method,
      count: row._count._all,
      amount: toNumber(row._sum.amount),
    })),
  };
};

const getRevenueSeries = async (businessId, dateRange) =>
  prisma.$queryRaw`
    SELECT
      date_trunc('day', collected_at) AS bucket,
      COALESCE(SUM(amount), 0)::text AS amount,
      COUNT(*)::int AS count
    FROM repair_payments
    WHERE business_id = ${businessId}::uuid
      AND deleted_at IS NULL
      AND status = 'COMPLETED'::"RepairPaymentStatus"
      AND collected_at IS NOT NULL
      AND (${dateRange.from}::timestamp IS NULL OR collected_at >= ${dateRange.from})
      AND (${dateRange.to}::timestamp IS NULL OR collected_at <= ${dateRange.to})
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

const getProfitability = async (businessId, dateRange, limit = 20) => {
  const rows = await prisma.$queryRaw`
    SELECT
      rt.id AS "ticketId",
      rt.ticket_number AS "ticketNumber",
      rt.title,
      rt.status,
      COALESCE(SUM(ri.total_amount), 0)::text AS "invoiceRevenue",
      COALESCE(parts.actual_cost, 0)::text AS "actualPartsCost",
      COALESCE(estimates.estimated_cost, 0)::text AS "estimatedCost",
      (COALESCE(SUM(ri.total_amount), 0) - COALESCE(parts.actual_cost, 0))::text AS "actualMargin"
    FROM repair_tickets rt
    LEFT JOIN repair_invoices ri
      ON ri.repair_ticket_id = rt.id
      AND ri.business_id = rt.business_id
      AND ri.deleted_at IS NULL
      AND ri.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')
    LEFT JOIN (
      SELECT repair_ticket_id, SUM(COALESCE(total_cost, 0)) AS actual_cost
      FROM repair_parts_usage
      WHERE business_id = ${businessId}::uuid AND deleted_at IS NULL
      GROUP BY repair_ticket_id
    ) parts ON parts.repair_ticket_id = rt.id
    LEFT JOIN (
      SELECT repair_ticket_id, SUM(COALESCE(total_amount, 0)) AS estimated_cost
      FROM repair_estimates
      WHERE business_id = ${businessId}::uuid AND deleted_at IS NULL AND status = 'APPROVED'::"EstimateStatus"
      GROUP BY repair_ticket_id
    ) estimates ON estimates.repair_ticket_id = rt.id
    WHERE rt.business_id = ${businessId}::uuid
      AND rt.deleted_at IS NULL
      AND (${dateRange.from}::timestamp IS NULL OR rt.created_at >= ${dateRange.from})
      AND (${dateRange.to}::timestamp IS NULL OR rt.created_at <= ${dateRange.to})
    GROUP BY rt.id, rt.ticket_number, rt.title, rt.status, parts.actual_cost, estimates.estimated_cost
    ORDER BY (COALESCE(SUM(ri.total_amount), 0) - COALESCE(parts.actual_cost, 0)) ASC
    LIMIT ${limit}
  `;

  const totals = rows.reduce(
    (summary, row) => {
      summary.invoiceRevenue += toNumber(row.invoiceRevenue);
      summary.actualPartsCost += toNumber(row.actualPartsCost);
      summary.estimatedCost += toNumber(row.estimatedCost);
      summary.actualMargin += toNumber(row.actualMargin);
      return summary;
    },
    {
      invoiceRevenue: 0,
      actualPartsCost: 0,
      estimatedCost: 0,
      actualMargin: 0,
    }
  );

  return {
    totals,
    highLossRepairs: rows
      .filter((row) => toNumber(row.actualMargin) < 0)
      .map((row) => ({
        ...row,
        invoiceRevenue: toNumber(row.invoiceRevenue),
        actualPartsCost: toNumber(row.actualPartsCost),
        estimatedCost: toNumber(row.estimatedCost),
        actualMargin: toNumber(row.actualMargin),
      })),
    repairs: rows.map((row) => ({
      ...row,
      invoiceRevenue: toNumber(row.invoiceRevenue),
      actualPartsCost: toNumber(row.actualPartsCost),
      estimatedCost: toNumber(row.estimatedCost),
      actualMargin: toNumber(row.actualMargin),
      estimatedMargin: Number((toNumber(row.invoiceRevenue) - toNumber(row.estimatedCost)).toFixed(2)),
      grossMargin:
        toNumber(row.invoiceRevenue) === 0
          ? 0
          : Number(((toNumber(row.actualMargin) / toNumber(row.invoiceRevenue)) * 100).toFixed(2)),
    })),
  };
};

const getTechnicianPerformance = async (businessId, dateRange) => {
  const rows = await prisma.repairAssignment.groupBy({
    by: ["assignedToStaffId"],
    where: {
      businessId,
      deletedAt: null,
      ...buildDateWhere("assignedAt", dateRange),
    },
    _count: {
      _all: true,
    },
  });

  const technicianIds = rows.map((row) => row.assignedToStaffId);
  const staff = await prisma.staffMember.findMany({
    where: {
      businessId,
      id: {
        in: technicianIds,
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });

  const completed = await prisma.repairAssignment.groupBy({
    by: ["assignedToStaffId"],
    where: {
      businessId,
      deletedAt: null,
      status: "COMPLETED",
      ...buildDateWhere("completedAt", dateRange),
    },
    _count: {
      _all: true,
    },
  });

  const reassignments = await prisma.repairTicketAssignment.groupBy({
    by: ["previousAssignedToStaffId"],
    where: {
      businessId,
      type: "REASSIGNED",
      previousAssignedToStaffId: {
        not: null,
      },
      ...buildDateWhere("assignedAt", dateRange),
    },
    _count: {
      _all: true,
    },
  });

  return rows.map((row) => {
    const technician = staff.find((item) => item.id === row.assignedToStaffId);
    const completedCount =
      completed.find((item) => item.assignedToStaffId === row.assignedToStaffId)?._count._all || 0;
    const reassignmentCount =
      reassignments.find((item) => item.previousAssignedToStaffId === row.assignedToStaffId)?._count
        ._all || 0;

    return {
      technician,
      assignedRepairs: row._count._all,
      completedRepairs: completedCount,
      reassignmentCount,
      completionEfficiency:
        row._count._all === 0 ? 0 : Number(((completedCount / row._count._all) * 100).toFixed(2)),
    };
  });
};

const getTechnicianWorkload = async (businessId) => {
  const rows = await prisma.repairAssignment.groupBy({
    by: ["assignedToStaffId", "status"],
    where: {
      businessId,
      deletedAt: null,
      completedAt: null,
      status: {
        in: ["ASSIGNED", "IN_PROGRESS", "PAUSED"],
      },
    },
    _count: {
      _all: true,
    },
  });

  const staff = await prisma.staffMember.findMany({
    where: {
      businessId,
      id: {
        in: [...new Set(rows.map((row) => row.assignedToStaffId))],
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });

  return rows.map((row) => ({
    technician: staff.find((item) => item.id === row.assignedToStaffId),
    status: row.status,
    activeAssignments: row._count._all,
  }));
};

const getInventoryUsage = async (businessId, dateRange) => {
  const [usage, movementSummary, lowStockItems] = await prisma.$transaction([
    prisma.repairPartsUsage.groupBy({
      by: ["partSku", "partName"],
      where: {
        businessId,
        deletedAt: null,
        ...buildDateWhere("usedAt", dateRange),
      },
      _sum: {
        quantity: true,
        totalCost: true,
      },
      orderBy: {
        _sum: {
          totalCost: "desc",
        },
      },
      take: 20,
    }),
    prisma.inventoryStockMovement.groupBy({
      by: ["type"],
      where: {
        businessId,
        ...buildDateWhere("createdAt", dateRange),
      },
      _count: {
        _all: true,
      },
      _sum: {
        quantityChanged: true,
      },
    }),
    prisma.inventoryItem.findMany({
      where: {
        businessId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        sku: true,
        partName: true,
        stockQuantity: true,
        reorderLevel: true,
      },
      orderBy: {
        stockQuantity: "asc",
      },
      take: 50,
    }),
  ]);

  return {
    mostConsumedParts: usage.map((row) => ({
      partSku: row.partSku,
      partName: row.partName,
      quantity: toNumber(row._sum.quantity),
      totalCost: toNumber(row._sum.totalCost),
    })),
    movementSummary: movementSummary.map((row) => ({
      type: row.type,
      count: row._count._all,
      quantityChanged: toNumber(row._sum.quantityChanged),
    })),
    lowStockAlerts: lowStockItems.filter(
      (item) => toNumber(item.stockQuantity) <= toNumber(item.reorderLevel)
    ),
  };
};

const getInventoryVariance = async (businessId, dateRange) =>
  prisma.$queryRaw`
    SELECT
      rt.id AS "ticketId",
      rt.ticket_number AS "ticketNumber",
      COALESCE(est.estimated_parts_amount, 0)::text AS "estimatedPartsAmount",
      COALESCE(actual.actual_parts_cost, 0)::text AS "actualPartsCost",
      (COALESCE(est.estimated_parts_amount, 0) - COALESCE(actual.actual_parts_cost, 0))::text AS "variance"
    FROM repair_tickets rt
    LEFT JOIN (
      SELECT repair_ticket_id, SUM(COALESCE(parts_amount, 0)) AS estimated_parts_amount
      FROM repair_estimates
      WHERE business_id = ${businessId}::uuid AND deleted_at IS NULL AND status = 'APPROVED'::"EstimateStatus"
      GROUP BY repair_ticket_id
    ) est ON est.repair_ticket_id = rt.id
    LEFT JOIN (
      SELECT repair_ticket_id, SUM(COALESCE(total_cost, 0)) AS actual_parts_cost
      FROM repair_parts_usage
      WHERE business_id = ${businessId}::uuid AND deleted_at IS NULL
      GROUP BY repair_ticket_id
    ) actual ON actual.repair_ticket_id = rt.id
    WHERE rt.business_id = ${businessId}::uuid
      AND rt.deleted_at IS NULL
      AND (${dateRange.from}::timestamp IS NULL OR rt.created_at >= ${dateRange.from})
      AND (${dateRange.to}::timestamp IS NULL OR rt.created_at <= ${dateRange.to})
    ORDER BY ABS((COALESCE(est.estimated_parts_amount, 0) - COALESCE(actual.actual_parts_cost, 0))) DESC
    LIMIT 50
  `;

const getSlaAnalytics = async (businessId, dateRange) => {
  const now = new Date();

  const [overdueTickets, breachedCount, avgResolutionHours] = await Promise.all([
    prisma.repairTicket.findMany({
      where: {
        businessId,
        deletedAt: null,
        dueAt: {
          lt: now,
        },
        status: {
          notIn: ["DELIVERED", "CANCELLED", "CLOSED"],
        },
        ...buildDateWhere("createdAt", dateRange),
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
      },
      orderBy: {
        dueAt: "asc",
      },
      take: 50,
    }),
    countTickets(businessId, dateRange, {
      dueAt: {
        lt: now,
      },
      status: {
        notIn: ["DELIVERED", "CANCELLED", "CLOSED"],
      },
    }),
    getAverageTurnaroundHours(businessId, dateRange),
  ]);

  return {
    overdueTickets,
    slaBreachCount: breachedCount,
    averageResolutionHours: avgResolutionHours,
  };
};

const getCustomerAnalytics = async (businessId, dateRange) => {
  const rows = await prisma.customer.findMany({
    where: {
      businessId,
      deletedAt: null,
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      tickets: {
        where: {
          deletedAt: null,
          ...buildDateWhere("createdAt", dateRange),
        },
        select: {
          id: true,
        },
      },
      invoices: {
        where: {
          deletedAt: null,
          ...buildDateWhere("issuedAt", dateRange),
        },
        select: {
          totalAmount: true,
          dueAmount: true,
        },
      },
    },
    take: 100,
  });

  const customers = rows.map((customer) => {
    const totalSpend = customer.invoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
    const outstandingBalance = customer.invoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.dueAmount),
      0
    );

    return {
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      repairFrequency: customer.tickets.length,
      totalSpend,
      outstandingBalance,
    };
  });

  return {
    repeatCustomers: customers.filter((customer) => customer.repairFrequency > 1),
    highValueCustomers: [...customers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 20),
    outstandingBalances: [...customers]
      .filter((customer) => customer.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
      .slice(0, 20),
    averageCustomerSpend:
      customers.length === 0
        ? 0
        : Number(
            (
              customers.reduce((sum, customer) => sum + customer.totalSpend, 0) / customers.length
            ).toFixed(2)
          ),
  };
};

module.exports = {
  getRepairSummary,
  getStatusBreakdown,
  getAverageTurnaroundHours,
  getFinancialSummary,
  getRevenueSeries,
  getProfitability,
  getTechnicianPerformance,
  getTechnicianWorkload,
  getInventoryUsage,
  getInventoryVariance,
  getSlaAnalytics,
  getCustomerAnalytics,
  sumField,
  buildDateWhere,
};
