import { del, get, patch, post } from "@/services/api";

export const authApi = {
  signup: (payload) => post("/auth/signup", payload),
  login: (payload) => post("/auth/login", payload),
  me: () => get("/auth/me"),
  logout: () => post("/auth/logout"),
  forgotPassword: (payload) => post("/auth/forgot-password", payload),
  resetPassword: (payload) => post("/auth/reset-password", payload),
  changePassword: (payload) => post("/auth/change-password", payload),
  getBranchesByEmail: (params) => get("/auth/branches-by-email", params),
};

export const analyticsApi = {
  ownerDashboard: (params) => get("/analytics/dashboard/owner", params),
  statusBreakdown: (params) => get("/analytics/repairs/status-breakdown", params),
  technicianWorkload: (params) => get("/analytics/technicians/workload", params),
};

export const repairApi = {
  list: (params) => get("/repair/tickets", params),
  get: (id) => get(`/repair/tickets/${id}`),
  create: (payload) => post("/repair/tickets", payload),
  updateStatus: (id, payload) => patch(`/repair/tickets/${id}/status`, payload),
  updateExecution: (id, payload) => patch(`/repair/tickets/${id}/execution`, payload),
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

export const businessProfileApi = {
  get: () => get("/business/profile"),
  update: (payload) => patch("/business/profile", payload),
};

export const branchesApi = {
  list: () => get("/branches"),
  create: (payload) => post("/branches", payload),
  get: (id) => get(`/branches/${id}`),
  update: (id, payload) => patch(`/branches/${id}`, payload),
  activate: (id) => post(`/branches/${id}/activate`),
  deactivate: (id) => post(`/branches/${id}/deactivate`),
  delete: (id) => del(`/branches/${id}`),
};

export const staffApi = {
  list: () => get("/staff"),
  createStaff: (payload) => post("/staff", payload),
  disable: (id) => post(`/staff/${id}/disable`),
  enable: (id) => post(`/staff/${id}/enable`),
  resetPassword: (id, payload) => post(`/staff/${id}/reset-password`, payload),
  assignBranch: (id, payload) => patch(`/staff/${id}/branch`, payload),
  delete: (id) => del(`/staff/${id}`),
};

export const subscriptionApi = {
  current: () => get("/subscription/current"),
  startTrial: () => post("/subscription/start-trial"),
  requestPayment: (payload) => post("/subscription/payment-request", payload),
};

export const superAdminApi = {
  businesses: (params) => get("/super-admin/businesses", params),
  business: (id) => get(`/super-admin/businesses/${id}`),
  suspend: (id) => patch(`/super-admin/businesses/${id}/suspend`),
  activate: (id) => patch(`/super-admin/businesses/${id}/activate`),
  updateSubscription: (id, payload) => patch(`/super-admin/businesses/${id}/subscription`, payload),
  submitContactRequest: (payload) => post("/super-admin/contacts", payload),
  contacts: () => get("/super-admin/contacts"),
};
