const analyticsRepository = require("./repository");
const { ANALYTICS_PERIODS } = require("./constants");

const toNumber = (value) => Number(value || 0);

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const resolveDateRange = (query = {}) => {
  const now = new Date();

  if (query.period === ANALYTICS_PERIODS.CUSTOM) {
    return {
      from: query.from ? startOfDay(query.from) : undefined,
      to: query.to ? endOfDay(query.to) : undefined,
      period: query.period,
      timezone: query.timezone,
    };
  }

  const from = startOfDay(now);

  if (query.period === ANALYTICS_PERIODS.WEEK) {
    from.setDate(from.getDate() - 6);
  } else if (query.period === ANALYTICS_PERIODS.MONTH) {
    from.setMonth(from.getMonth() - 1);
  }

  return {
    from,
    to: endOfDay(now),
    period: query.period || ANALYTICS_PERIODS.MONTH,
    timezone: query.timezone,
  };
};

const withMeta = (query, data) => ({
  ...data,
  dateRange: resolveDateRange(query),
});

const getOwnerDashboard = async (user, query) => {
  const dateRange = resolveDateRange(query);
  const [
    repairs,
    finance,
    inventory,
    technicianPerformance,
    averageRepairTurnaroundHours,
  ] = await Promise.all([
    analyticsRepository.getRepairSummary(user.businessId, dateRange),
    analyticsRepository.getFinancialSummary(user.businessId, dateRange),
    analyticsRepository.getInventoryUsage(user.businessId, dateRange),
    analyticsRepository.getTechnicianPerformance(user.businessId, dateRange),
    analyticsRepository.getAverageTurnaroundHours(user.businessId, dateRange),
  ]);

  return {
    dateRange,
    repairs,
    revenueSummary: {
      totalRevenue: finance.totalRevenue,
      collectedRevenue: finance.collectedRevenue,
      pendingDues: finance.outstandingDues,
      averageInvoiceValue: finance.averageInvoiceValue,
    },
    totalPaymentsCollected: finance.collectedRevenue,
    inventoryConsumptionValue: inventory.mostConsumedParts.reduce(
      (sum, part) => sum + toNumber(part.totalCost),
      0
    ),
    technicianUtilizationSummary: technicianPerformance,
    averageRepairTurnaroundHours,
  };
};

const getRepairSummary = async (user, query) => {
  const dateRange = resolveDateRange(query);
  const [summary, averageTurnaroundHours, repairsPerTechnician] = await Promise.all([
    analyticsRepository.getRepairSummary(user.businessId, dateRange),
    analyticsRepository.getAverageTurnaroundHours(user.businessId, dateRange),
    analyticsRepository.getTechnicianPerformance(user.businessId, dateRange),
  ]);

  return {
    dateRange,
    summary: {
      ...summary,
      averageTurnaroundHours,
      repairsPerTechnician,
    },
  };
};

const getRepairStatusBreakdown = async (user, query) => {
  const dateRange = resolveDateRange(query);
  const breakdown = await analyticsRepository.getStatusBreakdown(user.businessId, dateRange);

  return {
    dateRange,
    breakdown: breakdown.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
  };
};

const getFinanceRevenue = async (user, query) => {
  const dateRange = resolveDateRange(query);
  const [summary, series] = await Promise.all([
    analyticsRepository.getFinancialSummary(user.businessId, dateRange),
    analyticsRepository.getRevenueSeries(user.businessId, dateRange),
  ]);

  return {
    dateRange,
    summary,
    series: series.map((row) => ({
      bucket: row.bucket,
      amount: toNumber(row.amount),
      count: row.count,
    })),
  };
};

const getFinanceDues = async (user, query) =>
  withMeta(query, {
    dues: await analyticsRepository.getFinancialSummary(user.businessId, resolveDateRange(query)),
  });

const getFinancePayments = async (user, query) =>
  withMeta(query, {
    payments: await analyticsRepository.getFinancialSummary(user.businessId, resolveDateRange(query)),
  });

const getProfitability = async (user, query) => {
  const dateRange = resolveDateRange(query);
  const profitability = await analyticsRepository.getProfitability(user.businessId, dateRange);

  return {
    dateRange,
    profitability,
  };
};

const getTechnicianPerformance = async (user, query) =>
  withMeta(query, {
    technicians: await analyticsRepository.getTechnicianPerformance(
      user.businessId,
      resolveDateRange(query)
    ),
  });

const getTechnicianWorkload = async (user, query) =>
  withMeta(query, {
    workload: await analyticsRepository.getTechnicianWorkload(user.businessId),
  });

const getInventoryUsage = async (user, query) =>
  withMeta(query, {
    inventory: await analyticsRepository.getInventoryUsage(user.businessId, resolveDateRange(query)),
  });

const getInventoryVariance = async (user, query) => {
  const dateRange = resolveDateRange(query);
  const variance = await analyticsRepository.getInventoryVariance(user.businessId, dateRange);

  return {
    dateRange,
    variance: variance.map((row) => ({
      ...row,
      estimatedPartsAmount: toNumber(row.estimatedPartsAmount),
      actualPartsCost: toNumber(row.actualPartsCost),
      variance: toNumber(row.variance),
    })),
  };
};

const getSlaAnalytics = async (user, query) =>
  withMeta(query, {
    sla: await analyticsRepository.getSlaAnalytics(user.businessId, resolveDateRange(query)),
  });

const getCustomerAnalytics = async (user, query) =>
  withMeta(query, {
    customers: await analyticsRepository.getCustomerAnalytics(
      user.businessId,
      resolveDateRange(query)
    ),
  });

module.exports = {
  getOwnerDashboard,
  getRepairSummary,
  getRepairStatusBreakdown,
  getFinanceRevenue,
  getFinanceDues,
  getFinancePayments,
  getProfitability,
  getTechnicianPerformance,
  getTechnicianWorkload,
  getInventoryUsage,
  getInventoryVariance,
  getSlaAnalytics,
  getCustomerAnalytics,
};
