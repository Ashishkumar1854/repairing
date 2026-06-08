import { get, patch, post } from "@/services/api";

export const authApi = {
  login: (payload) => post("/auth/login", payload),
  me: () => get("/auth/me"),
  logout: () => post("/auth/logout"),
};

export const analyticsApi = {
  ownerDashboard: (params) => get("/analytics/dashboard/owner", params),
  repairSummary: (params) => get("/analytics/repairs/summary", params),
  statusBreakdown: (params) => get("/analytics/repairs/status-breakdown", params),
  revenue: (params) => get("/analytics/finance/revenue", params),
  dues: (params) => get("/analytics/finance/dues", params),
  payments: (params) => get("/analytics/finance/payments", params),
  profitability: (params) => get("/analytics/profitability", params),
  technicianPerformance: (params) => get("/analytics/technicians/performance", params),
  technicianWorkload: (params) => get("/analytics/technicians/workload", params),
  inventoryUsage: (params) => get("/analytics/inventory/usage", params),
  inventoryVariance: (params) => get("/analytics/inventory/variance", params),
  sla: (params) => get("/analytics/sla", params),
  customers: (params) => get("/analytics/customers", params),
};

export const repairApi = {
  list: (params) => get("/repair/tickets", params),
  get: (id) => get(`/repair/tickets/${id}`),
  create: (payload) => post("/repair/tickets", payload),
  updateStatus: (id, payload) => patch(`/repair/tickets/${id}/status`, payload),
  createEstimate: (ticketId, payload) => post(`/repair/tickets/${ticketId}/estimate`, payload),
  getEstimate: (id) => get(`/repair/estimates/${id}`),
  approveEstimate: (id, payload) => post(`/repair/estimates/${id}/approve`, payload),
  rejectEstimate: (id, payload) => post(`/repair/estimates/${id}/reject`, payload),
  consumeParts: (ticketId, payload) => post(`/repair/tickets/${ticketId}/consume-parts`, payload),
  partsUsage: (ticketId) => get(`/repair/tickets/${ticketId}/parts-usage`),
  assign: (ticketId, payload) => post(`/repair/tickets/${ticketId}/assign`, payload),
  reassign: (ticketId, payload) => post(`/repair/tickets/${ticketId}/reassign`, payload),
  assignments: (ticketId) => get(`/repair/tickets/${ticketId}/assignments`),
  handover: (ticketId, payload) => post(`/repair/tickets/${ticketId}/handover`, payload),
  handovers: (ticketId) => get(`/repair/tickets/${ticketId}/handovers`),
  currentCustody: (ticketId) => get(`/repair/tickets/${ticketId}/current-custody`),
  invoice: (ticketId, payload) => post(`/repair/tickets/${ticketId}/invoice`, payload),
  vendorDispatch: (ticketId, payload) => post(`/repair/tickets/${ticketId}/vendor-dispatch`, payload),
};

export const inventoryApi = {
  list: (params) => get("/inventory/items", params),
  create: (payload) => post("/inventory/items", payload),
  get: (id) => get(`/inventory/items/${id}`),
  update: (id, payload) => patch(`/inventory/items/${id}`, payload),
};

export const billingApi = {
  invoices: (params) => get("/billing/invoices", params),
  invoice: (id) => get(`/billing/invoices/${id}`),
  collectPayment: (id, payload) => post(`/billing/invoices/${id}/payments`, payload),
  customerLedger: (id) => get(`/customers/${id}/ledger`),
};

export const customersApi = {
  search: (params) => get("/customers/search", params),
  tickets: (id) => get(`/customers/${id}/tickets`),
};

export const assignmentsApi = {
  queue: (params) => get("/technicians/me/queue", params),
  dashboard: (params) => get("/technicians/me/dashboard", params),
};

export const vendorsApi = {
  list: (params) => get("/vendors", params),
  create: (payload) => post("/vendors", payload),
  jobs: (params) => get("/vendors/repair-jobs", params),
  updateJob: (id, payload) => patch(`/vendors/repair-jobs/${id}/status`, payload),
  receiveJob: (id, payload) => post(`/vendors/repair-jobs/${id}/receive`, payload),
  costs: (id, payload) => post(`/vendors/repair-jobs/${id}/costs`, payload),
};
