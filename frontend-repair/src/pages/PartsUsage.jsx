import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { inventoryApi, repairApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";
import { useState } from "react";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { ticketLabel } from "@/utils/ticketLabel";

export function PartsUsage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get("ticketId") || "");
  const [lastConsumedTicketId, setLastConsumedTicketId] = useState("");
  const ticketsQuery = useQuery({ queryKey: ["repair", "parts-usage-candidates"], queryFn: () => repairApi.list({ limit: 100 }) });
  const itemsQuery = useQuery({ queryKey: ["inventory"], queryFn: () => inventoryApi.list() });
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]).filter((ticket) => ["APPROVED", "IN_REPAIR", "WAITING_PARTS"].includes(ticket.status));
  const items = unwrapArray(itemsQuery.data, ["items"]);
  const ticketNumberById = new Map(tickets.map((ticket) => [ticket.id, ticketLabel(ticket)]));
  const activeTicketId = selectedTicketId || tickets[0]?.id || "";
  const activeTicket = tickets.find((ticket) => ticket.id === activeTicketId);
  const usageQuery = useQuery({ queryKey: ["parts-usage", activeTicketId], queryFn: () => repairApi.partsUsage(activeTicketId), enabled: Boolean(activeTicketId) });
  const usage = unwrapArray(usageQuery.data, ["partsUsage", "usages", "usage"]);
  const mutation = useNotifyMutation({
    mutationFn: async ({ ticketId, payload, ticketStatus }) => {
      if (ticketStatus === "APPROVED") {
        await repairApi.updateStatus(ticketId, {
          status: "IN_REPAIR",
          reason: "Started repair before consuming parts.",
        });
      }
      return repairApi.consumeParts(ticketId, payload);
    },
    successMessage: "Parts consumed successfully.",
    onSuccess: async (_data, variables) => {
      setLastConsumedTicketId(variables.ticketId);
      await queryClient.invalidateQueries();
    },
  });

  return (
    <>
      <PageHeader title="Repair Parts Usage" description="Actual operational parts usage, ticket usage, and consumption history." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <Card><CardContent className="space-y-4"><Select value={activeTicketId} onChange={(event) => setSelectedTicketId(event.target.value)}>{tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticketLabel(ticket)}</option>)}</Select><Table><thead><tr><Th>Part</Th><Th>Quantity</Th><Th>Repair Ticket</Th><Th>Technician</Th><Th>Cost</Th><Th>Date</Th></tr></thead><tbody>{usage.map((item, index) => <tr key={item.id || index}><Td>{item.inventoryItem?.partName || item.partName || item.partSku || "Part"}</Td><Td>{String(item.quantity)}</Td><Td>{item.ticket ? ticketLabel(item.ticket) : ticketNumberById.get(item.repairTicketId) || ticketNumberById.get(activeTicketId) || item.repairTicketId || activeTicketId}</Td><Td>{item.technician?.fullName || item.technicianId || "Not set"}</Td><Td>{formatCurrency(item.totalCost || Number(item.quantity || 0) * Number(item.unitCost || 0))}</Td><Td>{item.usedAt || item.createdAt}</Td></tr>)}</tbody></Table>{!usage.length ? <p className="text-sm text-[var(--muted)]">No parts usage has been recorded for this ticket.</p> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle>Consume Parts</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const ticketId = form.get("ticketId"); const ticket = tickets.find((item) => item.id === ticketId); setSelectedTicketId(ticketId); mutation.mutate({ ticketId, ticketStatus: ticket?.status, payload: { parts: [{ inventoryItemId: form.get("inventoryItemId"), quantity: Number(form.get("quantity") || 0), notes: form.get("notes") || undefined }] } }); }}><Select name="ticketId" value={activeTicketId} onChange={(event) => setSelectedTicketId(event.target.value)}>{tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticketLabel(ticket)}</option>)}</Select>{!tickets.length ? <p className="text-sm text-[var(--muted)]">No approved or in-repair tickets are ready for parts usage.</p> : null}{activeTicket?.status === "APPROVED" ? <p className="text-sm text-[var(--muted)]">This approved repair will be moved to IN_REPAIR before parts are consumed.</p> : null}<Select name="inventoryItemId">{items.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.partName}</option>)}</Select><Input name="quantity" type="number" min="0.01" step="0.01" placeholder="Quantity" /><Input name="notes" placeholder="Notes" /><Button className="w-full" disabled={mutation.isPending || !tickets.length || !items.length}>Consume</Button></form>{lastConsumedTicketId ? <Link className="mt-3 block" to={`/billing?ticketId=${lastConsumedTicketId}`}><Button className="w-full" type="button" variant="secondary">Go to Billing</Button></Link> : null}</CardContent></Card>
      </div>
    </>
  );
}
