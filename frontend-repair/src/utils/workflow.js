export const ticketStatuses = [
  "RECEIVED",
  "DIAGNOSING",
  "ESTIMATE_PENDING",
  "WAITING_APPROVAL",
  "APPROVED",
  "IN_REPAIR",
  "WAITING_PARTS",
  "SENT_TO_VENDOR",
  "READY_FOR_REVIEW",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "CLOSED",
];

export const repairStatusTransitions = Object.freeze({
  RECEIVED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["ESTIMATE_PENDING", "IN_REPAIR", "WAITING_PARTS", "CANCELLED"],
  ESTIMATE_PENDING: ["WAITING_APPROVAL", "CANCELLED"],
  WAITING_APPROVAL: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_REPAIR", "WAITING_PARTS", "SENT_TO_VENDOR"],
  IN_REPAIR: ["WAITING_PARTS", "SENT_TO_VENDOR", "READY_FOR_REVIEW", "READY_FOR_DELIVERY", "CANCELLED"],
  WAITING_PARTS: ["IN_REPAIR", "SENT_TO_VENDOR", "CANCELLED"],
  SENT_TO_VENDOR: ["IN_REPAIR", "READY_FOR_REVIEW", "READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_REVIEW: ["IN_REPAIR", "SENT_TO_VENDOR", "READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["DELIVERED", "IN_REPAIR"],
  DELIVERED: ["CLOSED"],
  CANCELLED: ["CLOSED"],
  CLOSED: [],
});

export const getAllowedRepairTransitions = (status) => repairStatusTransitions[status] || [];

export const isTerminalTicketStatus = (status) => ["DELIVERED", "CANCELLED", "CLOSED"].includes(status);

export const isActiveAssignment = (assignment) => {
  if (!assignment || assignment.unassignedAt) return false;

  const state = assignment.status || assignment.type;
  return ["ASSIGNED", "REASSIGNED", "IN_PROGRESS", "PAUSED"].includes(state);
};

export const isTicketAssigned = (ticket) => (ticket?.assignments || []).some(isActiveAssignment);

export const isBillingEligibleTicket = (ticket, invoices = []) => {
  if (!ticket?.id || invoices.some((invoice) => invoice.repairTicketId === ticket.id || invoice.ticket?.id === ticket.id)) {
    return false;
  }

  const billableStatus = ["APPROVED", "IN_REPAIR", "WAITING_PARTS", "READY_FOR_DELIVERY", "DELIVERED"].includes(ticket.status);
  const hasEstimateData = Array.isArray(ticket.estimates) && ticket.estimates.length > 0;
  const hasUsageData = Array.isArray(ticket.partsUsage) || Array.isArray(ticket.partsUsages);
  const hasBillableEstimate = (ticket.estimates || []).some((estimate) => estimate.status === "APPROVED");
  const hasActualUsage = (ticket.partsUsage || ticket.partsUsages || []).length > 0;

  if (!billableStatus) return false;

  if (!hasEstimateData && !hasUsageData) {
    return true;
  }

  return hasBillableEstimate || hasActualUsage;
};

export const payableInvoices = (invoices = []) =>
  invoices.filter((invoice) => Number(invoice.dueAmount || 0) > 0 && invoice.status !== "PAID");

export const getValidHandoverTypes = (ticket) => {
  if (!ticket?.id || ticket.status === "CLOSED" || ticket.status === "CANCELLED") return [];

  const holder = ticket.currentHolderType || "RECEPTION";
  const actions = [];

  if (holder === "RECEPTION" && ticket.status === "RECEIVED") {
    actions.push("RECEPTION_TO_TECHNICIAN");
  }

  if (holder === "TECHNICIAN") {
    actions.push("TECHNICIAN_TO_RECEPTION");
    if (["APPROVED", "IN_REPAIR", "WAITING_PARTS"].includes(ticket.status)) {
      actions.push("TECHNICIAN_TO_VENDOR");
    }
  }

  if (holder === "VENDOR" && ticket.status === "SENT_TO_VENDOR") {
    actions.push("VENDOR_TO_RECEPTION");
  }

  if (holder === "RECEPTION" && ["IN_REPAIR", "READY_FOR_DELIVERY"].includes(ticket.status)) {
    actions.push("RECEPTION_TO_CUSTOMER");
  }

  return actions;
};
