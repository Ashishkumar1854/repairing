import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { repairApi } from "@/services/modules";
import { unwrapArray } from "@/utils/cn";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { getAllowedRepairTransitions, ticketStatuses } from "@/utils/workflow";

export function Repair() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data } = useQuery({ queryKey: ["repair", search, status], queryFn: () => repairApi.list({ search: search || undefined, status: status || undefined }) });
  const tickets = unwrapArray(data, ["tickets"]);
  const custodyQueries = useQueries({
    queries: tickets.map((ticket) => ({
      queryKey: ["repair", ticket.id, "current-custody"],
      queryFn: () => repairApi.currentCustody(ticket.id),
      enabled: Boolean(ticket.id),
    })),
  });
  const ticketsWithCustody = tickets.map((ticket, index) => mergeTicketCustody(ticket, custodyQueries[index]?.data));

  return (
    <>
      <PageHeader title="Repair" description="Repair list, details, create repair, update status, search, and filters." actions={<Link to="/repair/new"><Button><Plus className="h-4 w-4" />Create Repair</Button></Link>} />
      <Card className="mb-4">
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search repairs" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{ticketStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={ticketsWithCustody}
            emptyTitle="No repair tickets"
            emptyDescription="Create a repair ticket to begin the workflow."
            columns={[
              { key: "ticketNumber", header: "Ticket Number", render: (ticket) => <Link className="font-semibold text-[var(--primary)]" to={`/repair/${ticket.id}`}>{ticket.ticketNumber}</Link> },
              { key: "customer", header: "Customer", render: (ticket) => ticket.customer?.fullName || ticket.customerId },
              { key: "device", header: "Device", render: (ticket) => ticket.items?.[0] ? `${ticket.items[0].brand || ""} ${ticket.items[0].model || ""}`.trim() || ticket.items[0].itemType : "Device" },
              { key: "status", header: "Status", render: (ticket) => <StatusBadge status={ticket.status} /> },
              { key: "priority", header: "Priority" },
              { key: "assigned", header: "Assigned Technician", render: (ticket) => ticket.assignments?.[0]?.assignedTo?.fullName || "Unassigned" },
              { key: "paymentStatus", header: "Payment Status", render: (ticket) => <StatusBadge status={ticket.paymentStatus} /> },
              { key: "custody", header: "Current Custody Holder", render: (ticket) => <StatusBadge status={ticket.currentHolderType || "RECEPTION"} /> },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}

export function CreateRepair() {
  const mutation = useNotifyMutation({ mutationFn: repairApi.create, successMessage: "Repair ticket created successfully." });

  return (
    <>
      <PageHeader title="Create Repair" description="Repair intake creates customer, ticket, item, issue, and initial status log." />
      <Card>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            mutation.mutate({
              customer: { fullName: form.get("fullName"), phone: form.get("phone"), email: form.get("email") || undefined },
              title: form.get("title"),
              description: form.get("description"),
              priority: form.get("priority"),
              items: [{ itemType: "PHONE", brand: form.get("brand"), model: form.get("model"), serialNumber: form.get("serialNumber"), imei: form.get("imei"), condition: form.get("condition"), lockPin: form.get("lockPin") }],
              issues: [{ title: form.get("issueTitle"), description: form.get("issueDescription") }],
            });
          }}>
            <Input name="fullName" placeholder="Customer name" required /><Input name="phone" placeholder="Phone" required /><Input name="email" placeholder="Email" /><Select name="priority" defaultValue="NORMAL"><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></Select>
            <Input name="title" placeholder="Repair title" required /><Input name="brand" placeholder="Brand" /><Input name="model" placeholder="Model" /><Input name="serialNumber" placeholder="Serial number" /><Input name="imei" placeholder="IMEI" /><Input name="lockPin" placeholder="Lock PIN" />
            <Input name="condition" placeholder="Device condition" /><Input name="issueTitle" placeholder="Issue title" required /><Input name="issueDescription" placeholder="Issue description" /><Input name="description" placeholder="Ticket description" />
            <Button className="md:col-span-2" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create Repair"}</Button>
          </form>
          {mutation.data ? <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">Repair created: {mutation.data.data?.ticket?.ticketNumber || mutation.data.data?.ticket?.id || "created successfully"}</div> : null}
        </CardContent>
      </Card>
    </>
  );
}

export function RepairDetails({ id }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["repair", id], queryFn: () => repairApi.get(id), enabled: Boolean(id) });
  const custodyQuery = useQuery({ queryKey: ["repair", id, "current-custody"], queryFn: () => repairApi.currentCustody(id), enabled: Boolean(id) });
  const ticket = mergeTicketCustody(data?.data?.ticket || data?.data, custodyQuery.data);
  const allowedTransitions = getAllowedRepairTransitions(ticket?.status);
  const statusMutation = useNotifyMutation({ mutationFn: (payload) => repairApi.updateStatus(id, payload), successMessage: "Repair status updated.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair", id] }) });

  if (!ticket) return <p className="text-sm text-[var(--muted)]">Loading repair...</p>;

  return (
    <>
      <PageHeader title={ticket.ticketNumber} description={ticket.title} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><CardContent className="grid gap-4 md:grid-cols-3"><Info label="Customer" value={ticket.customer?.fullName || ticket.customerId} /><Info label="Status" value={<StatusBadge status={ticket.status} />} /><Info label="Priority" value={ticket.priority} /><Info label="Payment Status" value={<StatusBadge status={ticket.paymentStatus} />} /><Info label="Current Holder" value={<StatusBadge status={ticket.currentHolderType || "RECEPTION"} />} /><Info label="Location" value={ticket.currentLocation || "Not set"} /></CardContent></Card>
        <Card><CardContent>{allowedTransitions.length ? <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); statusMutation.mutate({ status: form.get("status"), reason: form.get("reason") }); }}><Select name="status" defaultValue={allowedTransitions[0]}>{allowedTransitions.map((status) => <option key={status}>{status}</option>)}</Select><Input name="reason" placeholder="Reason" /><Button className="w-full" disabled={statusMutation.isPending}>Update Status</Button></form> : <p className="text-sm text-[var(--muted)]">No backend-valid status transitions are available from {ticket.status}.</p>}</CardContent></Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Item Type</Th><Th>Brand</Th><Th>Model</Th><Th>Serial / IMEI</Th><Th>Condition</Th></tr></thead><tbody>{(ticket.items || []).map((item, index) => <tr key={item.id || index}><Td>{item.itemType}</Td><Td>{item.brand || "Not set"}</Td><Td>{item.model || "Not set"}</Td><Td>{item.serialNumber || item.imei || "Not set"}</Td><Td>{item.condition || "Not set"}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Issue</Th><Th>Description</Th><Th>Confirmed</Th></tr></thead><tbody>{(ticket.issues || []).map((issue, index) => <tr key={issue.id || index}><Td>{issue.title}</Td><Td>{issue.description || "Not set"}</Td><Td>{issue.isConfirmed ? "Yes" : "No"}</Td></tr>)}</tbody></Table></CardContent></Card>
      </div>
    </>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><div className="mt-1 text-sm">{value}</div></div>;
}

function mergeTicketCustody(ticket, custodyData) {
  if (!ticket) return ticket;

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
