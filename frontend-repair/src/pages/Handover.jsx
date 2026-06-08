import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { CustodyTimeline } from "@/features/handover/CustodyTimeline";
import { repairApi, vendorsApi } from "@/services/modules";
import { unwrapArray } from "@/utils/cn";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { getValidHandoverTypes } from "@/utils/workflow";

export function Handover() {
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState("");
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
  const mutation = useNotifyMutation({ mutationFn: ({ ticketId, payload }) => repairApi.handover(ticketId, payload), successMessage: "Handover recorded successfully.", onSuccess: () => queryClient.invalidateQueries() });

  return (
    <>
      <PageHeader title="Handover" description="Current holder, current location, handover history, custody timeline, and latest transition." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card><CardHeader><CardTitle>Current Custody</CardTitle></CardHeader><CardContent className="p-0"><Table><thead><tr><Th>Ticket</Th><Th>Status</Th><Th>Current Holder</Th><Th>Current Location</Th></tr></thead><tbody>{ticketsWithCustody.map((ticket) => <tr key={ticket.id}><Td><button className="text-left font-semibold text-[var(--primary)]" type="button" onClick={() => setSelectedTicketId(ticket.id)}>{ticket.ticketNumber}</button></Td><Td><StatusBadge status={ticket.status} /></Td><Td><StatusBadge status={ticket.currentHolderType || "RECEPTION"} /></Td><Td>{ticket.currentLocation || "Not set"}</Td></tr>)}</tbody></Table>{!ticketsWithCustody.length ? <div className="p-5"><EmptyState title="No repair tickets" description="Create a repair ticket before recording custody handovers." /></div> : null}</CardContent></Card>
        <HandoverForm
          activeTicketId={activeTicketId}
          mutation={mutation}
          onTicketChange={setSelectedTicketId}
          tickets={ticketsWithCustody}
          validTypes={validHandoverTypes}
          vendors={vendors}
        />
      </div>
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

function HandoverForm({ activeTicketId, mutation, onTicketChange, tickets, validTypes, vendors }) {
  const [type, setType] = useState("");
  const selectedType = validTypes.includes(type) ? type : validTypes[0] || "";
  const requiresTechnician = selectedType === "RECEPTION_TO_TECHNICIAN";
  const requiresVendor = selectedType === "TECHNICIAN_TO_VENDOR";
  const isCustomerDelivery = selectedType === "RECEPTION_TO_CUSTOMER";
  const canRecord = Boolean(validTypes.length);

  return (
    <Card>
      <CardHeader><CardTitle>Record Handover</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const ticketId = form.get("ticketId");
          onTicketChange(ticketId);
          mutation.mutate({
            ticketId,
            payload: {
              type: selectedType,
              toHolderId: requiresTechnician ? form.get("toHolderId") || undefined : undefined,
              vendorId: requiresVendor ? form.get("vendorId") || undefined : undefined,
              receiverName: isCustomerDelivery ? form.get("receiverName") || undefined : undefined,
              currentLocation: form.get("currentLocation") || undefined,
              notes: form.get("notes") || undefined,
            },
          });
        }}>
          <Select name="ticketId" value={activeTicketId} onChange={(event) => onTicketChange(event.target.value)}>
            {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketNumber}</option>)}
          </Select>
          <Select name="type" value={selectedType} onChange={(event) => setType(event.target.value)} disabled={!validTypes.length}>
            {validTypes.map((item) => <option key={item}>{item}</option>)}
          </Select>
          {!validTypes.length ? <p className="text-sm text-[var(--muted)]">No backend-valid handover action is available for this ticket status and custody holder.</p> : null}
          {requiresTechnician ? <Input name="toHolderId" placeholder="Assigned technician staff ID" required /> : null}
          {requiresVendor ? <Select name="vendorId" required><option value="">Select vendor</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</Select> : null}
          {isCustomerDelivery ? <Input name="receiverName" placeholder="Receiver name for customer delivery" /> : null}
          <Input name="currentLocation" placeholder="Current Location" disabled={!canRecord} />
          <Textarea name="notes" placeholder="Notes" disabled={!canRecord} />
          <Button className="w-full" disabled={mutation.isPending || !tickets.length || !canRecord || (requiresVendor && !vendors.length)}>Record Handover</Button>
        </form>
      </CardContent>
    </Card>
  );
}
