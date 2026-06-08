import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { Timeline } from "@/components/ui/Timeline";
import { repairApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";
import { firstObject } from "@/utils/data";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";

export function Estimates() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["repair", "estimate-candidates"], queryFn: () => repairApi.list({ limit: 100 }) });
  const estimateStatuses = ["DIAGNOSING", "ESTIMATE_PENDING", "WAITING_APPROVAL"];
  const tickets = unwrapArray(data, ["tickets"]).filter((ticket) => estimateStatuses.includes(ticket.status));
  const createCandidates = tickets.filter((ticket) => ["DIAGNOSING", "ESTIMATE_PENDING"].includes(ticket.status));
  const mutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.createEstimate(ticketId, payload),
    successMessage: "Estimate created successfully.",
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair", "estimate-candidates"] }),
  });

  return (
    <>
      <PageHeader title="Repair Estimates" description="Estimate list, details, approval workflow, and estimate history." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card><CardHeader><CardTitle>Estimate Candidates</CardTitle></CardHeader><CardContent className="space-y-3">{tickets.map((ticket) => <div key={ticket.id} className="rounded-md border border-[var(--border)] p-3"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{ticket.ticketNumber}</p><p className="text-sm text-[var(--muted)]">{ticket.title}</p>{ticket.estimates?.map((estimate) => <Link key={estimate.id} className="mt-2 block text-sm text-[var(--primary)]" to={`/repair/estimates/${estimate.id}`}>{estimate.estimateNumber || "Open estimate"}</Link>)}</div><StatusBadge status={ticket.status} /></div></div>)}{!tickets.length ? <p className="text-sm text-[var(--muted)]">{isLoading ? "Loading estimate candidates..." : "No tickets are currently in DIAGNOSING, ESTIMATE_PENDING, or WAITING_APPROVAL."}</p> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle>Create Estimate</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate({ ticketId: form.get("ticketId"), payload: { diagnosis: { diagnosis: form.get("diagnosis"), estimatedRepairNotes: form.get("estimatedRepairNotes"), estimatedTurnaroundHours: Number(form.get("estimatedTurnaroundHours") || 24) }, items: [{ itemType: "LABOR", name: "Labor Cost", quantity: 1, unitAmount: Number(form.get("laborCost") || 0) }, { itemType: "PART", name: "Parts Cost", quantity: 1, unitAmount: Number(form.get("partsCost") || 0) }], taxRate: Number(form.get("tax") || 0), discountAmount: Number(form.get("discount") || 0), notes: form.get("notes") } }); }}><Select name="ticketId" disabled={!createCandidates.length}>{createCandidates.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketNumber}</option>)}</Select>{!createCandidates.length ? <p className="text-sm text-[var(--muted)]">No tickets are eligible for estimate creation. Tickets already waiting for approval must be opened from the estimate link and approved or rejected.</p> : null}<Textarea name="diagnosis" placeholder="Diagnosis" required disabled={!createCandidates.length} /><Textarea name="estimatedRepairNotes" placeholder="Estimated repair notes" disabled={!createCandidates.length} /><Input name="estimatedTurnaroundHours" type="number" placeholder="Turnaround hours" disabled={!createCandidates.length} /><Input name="laborCost" type="number" placeholder="Labor Cost" disabled={!createCandidates.length} /><Input name="partsCost" type="number" placeholder="Parts Cost" disabled={!createCandidates.length} /><Input name="tax" type="number" placeholder="Tax %" disabled={!createCandidates.length} /><Input name="discount" type="number" placeholder="Discount" disabled={!createCandidates.length} /><Textarea name="notes" placeholder="Notes" disabled={!createCandidates.length} /><Button className="w-full" disabled={mutation.isPending || createCandidates.length === 0}>Create Estimate</Button></form>{mutation.data ? <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm"><StatusBadge status={mutation.data.data.estimate?.status} /><p className="mt-2">Total: {formatCurrency(mutation.data.data.estimate?.totalAmount)}</p></div> : null}</CardContent></Card>
      </div>
    </>
  );
}

export function EstimateDetails({ id }) {
  const { data, refetch } = useQuery({ queryKey: ["estimate", id], queryFn: () => repairApi.getEstimate(id), enabled: Boolean(id) });
  const estimate = firstObject(data, ["estimate"]);
  const approve = useNotifyMutation({ mutationFn: (payload) => repairApi.approveEstimate(id, payload), successMessage: "Estimate approved.", onSuccess: () => refetch() });
  const reject = useNotifyMutation({ mutationFn: (payload) => repairApi.rejectEstimate(id, payload), successMessage: "Estimate rejected.", onSuccess: () => refetch() });
  const canActOnEstimate = ["PENDING", "DRAFT", "SENT"].includes(estimate.status);
  const items = estimate.items || estimate.estimateItems || [];
  const history = estimate.auditLogs || estimate.statusLogs || [
    estimate.createdAt ? { id: "created", type: "CREATED", createdAt: estimate.createdAt } : null,
    estimate.approvedAt ? { id: "approved", type: "APPROVED", createdAt: estimate.approvedAt } : null,
    estimate.rejectedAt ? { id: "rejected", type: "REJECTED", createdAt: estimate.rejectedAt } : null,
  ].filter(Boolean);

  if (!estimate?.id) return <p className="text-sm text-[var(--muted)]">Loading estimate...</p>;

  return (
    <>
      <PageHeader title={estimate.estimateNumber || "Estimate Details"} description="Estimate details, approval status, estimate history, and immutable pricing snapshot." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="space-y-5">
          <Card>
            <CardContent className="grid gap-4 md:grid-cols-5">
              <Info label="Status" value={<StatusBadge status={estimate.status} />} />
              <Info label="Labor Cost" value={formatCurrency(estimate.laborAmount)} />
              <Info label="Parts Cost" value={formatCurrency(estimate.partsAmount)} />
              <Info label="Tax" value={formatCurrency(estimate.taxAmount)} />
              <Info label="Total" value={formatCurrency(estimate.totalAmount)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Estimate Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table><thead><tr><Th>Item</Th><Th>Type</Th><Th>Quantity</Th><Th>Unit</Th><Th>Total</Th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id || index}><Td>{item.name}</Td><Td>{item.itemType}</Td><Td>{String(item.quantity)}</Td><Td>{formatCurrency(item.unitAmount)}</Td><Td>{formatCurrency(item.totalAmount)}</Td></tr>)}</tbody></Table>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Estimate History</CardTitle></CardHeader><CardContent><Timeline items={history} /></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Approval Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea id="estimate-action-notes" placeholder="Approval or rejection notes" />
            {!canActOnEstimate ? <p className="text-sm text-[var(--muted)]">This estimate is finalized and no approval action is available.</p> : null}
            <ConfirmAction title="Approve estimate?" description="Approved estimate pricing becomes the customer approval snapshot." disabled={approve.isPending || !canActOnEstimate} onConfirm={() => approve.mutate({ notes: document.getElementById("estimate-action-notes")?.value || "" })}>Approve Estimate</ConfirmAction>
            <ConfirmAction title="Reject estimate?" description="This keeps the rejected estimate in history and may affect the repair workflow." variant="danger" disabled={reject.isPending || !canActOnEstimate} onConfirm={() => reject.mutate({ notes: document.getElementById("estimate-action-notes")?.value || "" })}>Reject Estimate</ConfirmAction>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><div className="mt-1 text-sm">{value}</div></div>;
}
