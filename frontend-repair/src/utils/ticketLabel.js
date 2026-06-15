export function ticketShortCode(ticket) {
  const raw = String(ticket?.ticketNumber || ticket?.id || "").replace(/[^a-zA-Z0-9]/g, "");
  if (!raw) return "----";
  return raw.slice(-4).toUpperCase();
}

export function ticketCustomerName(ticket) {
  return ticket?.customer?.fullName || ticket?.customerName || "Customer";
}

export function ticketLabel(ticket) {
  return `#${ticketShortCode(ticket)} · ${ticketCustomerName(ticket)}`;
}
