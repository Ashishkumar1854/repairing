import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Textarea, Field } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { CustodyTimeline } from "@/components/ui/CustodyTimeline";
import { repairApi, vendorsApi } from "@/services/modules";
import { unwrapArray } from "@/utils/cn";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { getValidHandoverTypes } from "@/utils/workflow";
import { ticketLabel } from "@/utils/ticketLabel";

export function Handover() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get("ticketId") || "");
  const [lastHandoverTicketId, setLastHandoverTicketId] = useState("");
  const { data } = useQuery({ queryKey: ["repair"], queryFn: () => repairApi.list({ limit: 100 }) });
  const vendorsQuery = useQuery({ queryKey: ["vendors"], queryFn: () => vendorsApi.list() });
  const tickets = unwrapArray(data, ["tickets"]);
  const custodyQueries = useQueries({
    queries: tickets.map((ticket) => ({
      queryKey: ["repair", ticket.id, "current-custody"],
      queryFn: () => repairApi.currentCustody(ticket.id),
      enabled: Boolean(ticket.id),
    })),
  });
  const ticketsWithCustody = tickets.map((ticket, index) => mergeTicketCustody(ticket, custodyQueries[index]?.data));
  const vendors = unwrapArray(vendorsQuery.data, ["vendors"]);
  const activeTicketId = selectedTicketId || ticketsWithCustody[0]?.id || "";
  const activeTicket = ticketsWithCustody.find((ticket) => ticket.id === activeTicketId);
  const validHandoverTypes = getValidHandoverTypes(activeTicket);
  const mutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.handover(ticketId, payload),
    successMessage: "Handover recorded successfully.",
    onSuccess: async (_data, variables) => {
      setLastHandoverTicketId(variables.ticketId);
      await queryClient.invalidateQueries();
    },
  });
  const closeMutation = useNotifyMutation({
    mutationFn: (ticketId) => repairApi.updateStatus(ticketId, { status: "CLOSED", reason: "Repair delivered and closed from handover workflow." }),
    successMessage: "Repair closed successfully.",
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <>
      <PageHeader title="Handover" description="Current holder, current location, handover history, custody timeline, and latest transition." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card><CardHeader><CardTitle>Current Custody</CardTitle></CardHeader><CardContent className="p-0"><Table><thead><tr><Th>Ticket</Th><Th>Status</Th><Th>Current Holder</Th><Th>Current Location</Th></tr></thead><tbody>{ticketsWithCustody.map((ticket) => <tr key={ticket.id}><Td><button className="text-left font-semibold text-[var(--primary)]" type="button" onClick={() => setSelectedTicketId(ticket.id)}>{ticketLabel(ticket)}</button></Td><Td><StatusBadge status={ticket.status} /></Td><Td><StatusBadge status={ticket.currentHolderType || "RECEPTION"} /></Td><Td>{ticket.currentLocation || "Not set"}</Td></tr>)}</tbody></Table>{!ticketsWithCustody.length ? <div className="p-5"><EmptyState title="No repair tickets" description="Create a repair ticket before recording custody handovers." /></div> : null}</CardContent></Card>
        <HandoverForm
          activeTicketId={activeTicketId}
          mutation={mutation}
          onTicketChange={setSelectedTicketId}
          tickets={ticketsWithCustody}
          validTypes={validHandoverTypes}
          vendors={vendors}
        />
      </div>
      {lastHandoverTicketId ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Delivery handover recorded. Final step: close the repair.</span>
            <Button type="button" size="sm" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate(lastHandoverTicketId)}>
              Close Repair
            </Button>
          </div>
        </div>
      ) : null}
      {activeTicketId ? <div className="mt-5"><CustodyTimeline ticketId={activeTicketId} /></div> : null}
    </>
  );
}

function mergeTicketCustody(ticket, custodyData) {
  const custodyTicket = custodyData?.data?.ticket;
  const custody = custodyData?.data?.custody;

  return {
    ...ticket,
    currentHolderType: custody?.currentHolderType || custodyTicket?.currentHolderType || ticket.currentHolderType,
    currentHolderId: custody?.currentHolderId || custodyTicket?.currentHolderId || ticket.currentHolderId,
    currentLocation: custody?.currentLocation || custodyTicket?.currentLocation || ticket.currentLocation,
    lastHandoverAt: custody?.lastHandoverAt || custodyTicket?.lastHandoverAt || ticket.lastHandoverAt,
  };
}

function getActiveTechnicianName(ticket) {
  if (!ticket?.assignments) return "Unassigned";
  const active = ticket.assignments.find(
    (a) => !a.unassignedAt && ["ASSIGNED", "REASSIGNED", "IN_PROGRESS", "PAUSED", "COMPLETED"].includes(a.status || a.type)
  );
  if (!active) return "Unassigned";
  const staff = active.assignedTo || active.technician || active.assignedToStaff;
  return staff?.fullName || staff?.name || active.assignedToName || "Unassigned";
}

function HandoverForm({ activeTicketId, mutation, onTicketChange, tickets }) {
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Fetch ticket details dynamically to show customer and technician
  const ticketQuery = useQuery({
    queryKey: ["repair-ticket-handover-detail", activeTicketId],
    queryFn: () => repairApi.get(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const ticket = ticketQuery.data?.data?.ticket || ticketQuery.data?.data || null;

  const customerName = ticket?.customer?.fullName || "Loading...";
  const technicianName = ticket ? getActiveTechnicianName(ticket) : "Loading...";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!activeTicketId) return;

    mutation.mutate({
      ticketId: activeTicketId,
      payload: {
        type: "RECEPTION_TO_CUSTOMER",
        receiverName: ticket?.customer?.fullName || "Customer",
        notes: notes || undefined,
        metadata: {
          deliveryDate,
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Handover</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Select Repair Ticket">
            <Select
              name="ticketId"
              value={activeTicketId}
              onChange={(event) => {
                onTicketChange(event.target.value);
                setNotes("");
              }}
            >
              <option value="" disabled>-- Select Ticket --</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {ticketLabel(t)} · {t.title}
                </option>
              ))}
            </Select>
          </Field>

          {ticket && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
              <div>
                <span className="text-slate-500 font-medium">Customer Name:</span>{" "}
                <span className="font-bold text-slate-800">{customerName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Technician Name:</span>{" "}
                <span className="font-bold text-slate-800">{technicianName}</span>
              </div>
            </div>
          )}

          <Field label="Delivery Date">
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
            />
          </Field>

          <Field label="Handover Notes">
            <Textarea
              placeholder="Record any remarks for delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <Button
            className="w-full"
            type="submit"
            disabled={mutation.isPending || !activeTicketId}
          >
            {mutation.isPending ? "Recording Handover..." : "Record Handover & Deliver"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
