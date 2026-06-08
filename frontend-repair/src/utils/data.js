export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of [
    "items",
    "rows",
    "data",
    "tickets",
    "invoices",
    "payments",
    "ledger",
    "entries",
    "history",
    "logs",
    "partsUsage",
    "usages",
    "assignments",
    "handovers",
    "vendorRepairJobs",
    "series",
    "breakdown",
    "repairs",
    "technicians",
    "workload",
    "mostConsumedParts",
    "movementSummary",
    "lowStockAlerts",
    "variance",
    "overdueTickets",
    "repeatCustomers",
    "highValueCustomers",
    "outstandingBalances",
  ]) {
    if (Array.isArray(value[key])) return value[key];
  }
  const directMetrics = Object.entries(value)
    .filter(([, item]) => typeof item === "number" || typeof item === "string")
    .map(([name, item]) => ({ name, value: Number(item) || 0, rawValue: item }));
  if (directMetrics.length) return directMetrics;
  return Object.entries(value).flatMap(([groupName, item]) => objectMetrics(item, groupName));
}

export function firstObject(envelope, keys) {
  const data = envelope?.data || envelope || {};
  for (const key of keys) {
    if (data[key] && typeof data[key] === "object") return data[key];
  }
  return data;
}

export function chartRowsFromEnvelope(envelope, preferredKeys = []) {
  const data = envelope?.data || {};
  for (const key of preferredKeys) {
    const rows = asArray(data[key]);
    if (rows.length) return normalizeRows(rows);
  }
  return normalizeRows(asArray(data));
}

function normalizeRows(rows) {
  return rows
    .map((row, index) => {
      if (typeof row === "number") return { name: `Metric ${index + 1}`, value: row };
      if (typeof row === "string") return { name: row, value: 1 };
      const name =
        row.name ||
        row.label ||
        row.metric ||
        row.technician?.fullName ||
        row.customer?.fullName ||
        row.fullName ||
        row.status ||
        row.method ||
        row.type ||
        row.bucket ||
        row.date ||
        row.day ||
        row.title ||
        row.ticketNumber ||
        row.partName ||
        `Metric ${index + 1}`;
      const value = Number(
        row.value ??
          row.total ??
          row.count ??
          row.amount ??
          row.revenue ??
          row.quantity ??
          row.activeAssignments ??
          row.assignedRepairs ??
          row.completedRepairs ??
          row.totalCost ??
          row.actualMargin ??
          row.invoiceRevenue ??
          row.totalSpend ??
          row.outstandingBalance ??
          row.repairFrequency ??
          row.slaBreachCount ??
          row.averageResolutionHours ??
          row.quantityChanged ??
          0
      );
      return { ...row, name: String(name), value: Number.isFinite(value) ? value : 0 };
    })
    .filter(
      (row) =>
        row.value !== 0 ||
        row.count !== undefined ||
        row.total !== undefined ||
        row.amount !== undefined ||
        row.assignedRepairs !== undefined
    );
}

export function displayValue(value, fallback = "Not set") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object") {
    return (
      value.fullName ||
      value.name ||
      value.title ||
      value.ticketNumber ||
      value.invoiceNumber ||
      value.sku ||
      value.email ||
      value.id ||
      fallback
    );
  }
  return fallback;
}

function humanizeKey(value) {
  return String(value)
    .replace(/\./g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function objectMetrics(value, prefix) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return [];
  return Object.entries(value)
    .filter(([, item]) => typeof item === "number" || typeof item === "string")
    .map(([name, item]) => ({
      name: humanizeKey(`${prefix}.${name}`),
      value: Number(item) || 0,
      rawValue: item,
    }));
}
