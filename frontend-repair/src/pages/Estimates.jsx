import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { ticketLabel } from "@/utils/ticketLabel";

export function Estimates() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedTicketId = searchParams.get("ticketId") || "";
  const [selectedTicketId, setSelectedTicketId] = useState(preselectedTicketId);
  const [lastApprovedTicketId, setLastApprovedTicketId] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["repair", "estimate-candidates"], queryFn: () => repairApi.list({ limit: 100 }) });
  const estimateStatuses = ["DIAGNOSING", "ESTIMATE_PENDING", "WAITING_APPROVAL"];
  const tickets = unwrapArray(data, ["tickets"]).filter((ticket) => estimateStatuses.includes(ticket.status));
  const createCandidates = tickets.filter((ticket) => ["DIAGNOSING", "ESTIMATE_PENDING"].includes(ticket.status));
  const activeTicketId = createCandidates.some((ticket) => ticket.id === selectedTicketId) ? selectedTicketId : createCandidates[0]?.id || "";
  const mutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.createEstimate(ticketId, payload),
    successMessage: "Estimate created successfully.",
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair", "estimate-candidates"] }),
  });
  const createdEstimate = mutation.data?.data?.estimate;
  const approveCreatedEstimate = useNotifyMutation({
    mutationFn: (payload) => repairApi.approveEstimate(createdEstimate.id, payload),
    successMessage: "Estimate approved. Ticket is ready for billing.",
    onSuccess: async () => {
      setLastApprovedTicketId(createdEstimate.repairTicketId || createdEstimate.ticketId || "");
      await queryClient.invalidateQueries({ queryKey: ["repair", "estimate-candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["repair"] });
    },
  });
  const createdEstimateApproved = approveCreatedEstimate.data?.data?.estimate?.status === "APPROVED";
  const approveWaitingEstimate = useNotifyMutation({
    mutationFn: ({ estimateId, payload }) => repairApi.approveEstimate(estimateId, payload),
    successMessage: "Estimate approved. Ticket is ready for billing.",
    onSuccess: async (_data, variables) => {
      setLastApprovedTicketId(variables.ticketId || "");
      await queryClient.invalidateQueries({ queryKey: ["repair", "estimate-candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["repair"] });
    },
  });

  return (
    <>
      <PageHeader title="Repair Estimates" description="Estimate list, details, approval workflow, and estimate history." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card>
          <CardHeader><CardTitle>Estimate Candidates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tickets.map((ticket) => {
              const latestEstimate = ticket.latestEstimate || ticket.estimates?.[0] || null;
              const canApproveWaitingEstimate = ticket.status === "WAITING_APPROVAL" && latestEstimate?.id && ["PENDING", "DRAFT", "SENT"].includes(latestEstimate.status);

              return (
              <div key={ticket.id} className="rounded-md border border-[var(--border)] p-3">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{ticketLabel(ticket)}</p>
                    <p className="text-sm text-[var(--muted)]">{ticket.title}</p>
                    {latestEstimate?.id ? (
                      <Link className="mt-2 block text-sm text-[var(--primary)]" to={`/repair/estimates/${latestEstimate.id}`}>
                        {latestEstimate.estimateNumber || "Open estimate"} · {formatCurrency(latestEstimate.totalAmount)}
                      </Link>
                    ) : null}
                    {ticket.status === "WAITING_APPROVAL" && !latestEstimate?.id ? (
                      <p className="mt-2 text-sm text-amber-700">Estimate created, but this response does not include an estimate id yet.</p>
                    ) : null}
                    {canApproveWaitingEstimate ? (
                      <Button
                        className="mt-3"
                        type="button"
                        disabled={approveWaitingEstimate.isPending}
                        onClick={() => approveWaitingEstimate.mutate({
                          estimateId: latestEstimate.id,
                          ticketId: ticket.id,
                          payload: { notes: "Approved from estimate workflow list." },
                        })}
                      >
                        {approveWaitingEstimate.isPending ? "Approving..." : "Approve Estimate"}
                      </Button>
                    ) : null}
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
              );
            })}
            {!tickets.length ? (
              <p className="text-sm text-[var(--muted)]">
                {isLoading ? "Loading estimate candidates..." : "No tickets are currently in DIAGNOSING, ESTIMATE_PENDING, or WAITING_APPROVAL."}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Create Estimate</CardTitle></CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const repairNote = String(form.get("repairNote") || "").trim();
                mutation.mutate({
                  ticketId: form.get("ticketId"),
                  payload: {
                    diagnosis: {
                      diagnosis: repairNote,
                      estimatedRepairNotes: repairNote,
                      estimatedTurnaroundHours: Number(form.get("estimatedTurnaroundHours") || 24),
                    },
                    items: [
                      { itemType: "LABOR", name: "Labor Cost", quantity: 1, unitAmount: Number(form.get("laborCost") || 0) },
                      { itemType: "PART", name: "Parts Cost", quantity: 1, unitAmount: Number(form.get("partsCost") || 0) },
                    ],
                    taxRate: Number(form.get("tax") || 0),
                    discountAmount: Number(form.get("discount") || 0),
                    notes: repairNote,
                  },
                });
              }}
            >
              <Select name="ticketId" disabled={!createCandidates.length} value={activeTicketId} onChange={(event) => setSelectedTicketId(event.target.value)}>
                {createCandidates.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticketLabel(ticket)}</option>)}
              </Select>
              {!createCandidates.length ? <p className="text-sm text-[var(--muted)]">No tickets are eligible for estimate creation. Tickets already waiting for approval must be opened from the estimate link and approved or rejected.</p> : null}
              <Textarea name="repairNote" placeholder="Diagnosis, estimate repair note, and customer note" required disabled={!createCandidates.length} />
              <Input name="estimatedTurnaroundHours" type="number" placeholder="Turnaround hours" disabled={!createCandidates.length} />
              <Input name="laborCost" type="number" placeholder="Labor Cost" disabled={!createCandidates.length} />
              <Input name="partsCost" type="number" placeholder="Parts Cost" disabled={!createCandidates.length} />
              <Input name="tax" type="number" placeholder="Tax %" disabled={!createCandidates.length} />
              <Input name="discount" type="number" placeholder="Discount" disabled={!createCandidates.length} />
              <Button className="w-full" disabled={mutation.isPending || createCandidates.length === 0}>Create Estimate</Button>
            </form>
            {createdEstimate ? (
              <div className="mt-4 space-y-3 rounded-md bg-slate-50 p-3 text-sm">
                <div>
                  <StatusBadge status={approveCreatedEstimate.data?.data?.estimate?.status || createdEstimate.status} />
                  <p className="mt-2 font-semibold">Total: {formatCurrency(createdEstimate.totalAmount)}</p>
                  <p className="mt-1 text-[var(--muted)]">Next step: approve the estimate, then record actual parts usage.</p>
                </div>
                {createdEstimateApproved ? (
                  <Link to={`/repair/parts-usage?ticketId=${lastApprovedTicketId || createdEstimate.repairTicketId || createdEstimate.ticketId || ""}`}>
                    <Button className="w-full" type="button">Go to Parts Usage</Button>
                  </Link>
                ) : (
                  <Button className="w-full" type="button" disabled={approveCreatedEstimate.isPending} onClick={() => approveCreatedEstimate.mutate({ notes: "Approved from estimate creation workflow." })}>
                    {approveCreatedEstimate.isPending ? "Approving..." : "Approve Estimate"}
                  </Button>
                )}
              </div>
            ) : null}
            {lastApprovedTicketId && !createdEstimate ? (
              <Link className="mt-4 block" to={`/repair/parts-usage?ticketId=${lastApprovedTicketId}`}>
                <Button className="w-full" type="button">Go to Parts Usage</Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function EstimateDetails({ id }) {
  const { data, refetch } = useQuery({ queryKey: ["estimate", id], queryFn: () => repairApi.getEstimate(id), enabled: Boolean(id) });
  const estimate = firstObject(data, ["estimate"]);

  // Fetch ticket details dynamically
  const ticketQuery = useQuery({
    queryKey: ["repair-ticket-estimate-details", estimate?.repairTicketId],
    queryFn: () => repairApi.get(estimate.repairTicketId),
    enabled: Boolean(estimate?.repairTicketId),
  });
  const ticket = ticketQuery.data?.data?.ticket || ticketQuery.data?.data || null;

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

  const device = ticket?.items?.[0] || null;
  const issues = ticket?.issues || [];

  // Variance calculations
  const estimatedCost = Number(estimate.totalAmount || 0);
  const approvedCost = estimate.status === "APPROVED" ? Number(estimate.totalAmount || 0) : 0;
  const actualCost = Number(ticket?.totalRepairCost || 0);
  const variance = actualCost - approvedCost;

  return (
    <>
      <PageHeader title={estimate.estimateNumber || "Estimate Details"} description="Comprehensive estimate proposal, customer approval state, and actual operation cost comparison." />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* Main Info Strip */}
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 py-4">
              <Info label="Status" value={<StatusBadge status={estimate.status} />} />
              <Info label="Labor Estimate" value={formatCurrency(estimate.laborAmount)} />
              <Info label="Parts Estimate" value={formatCurrency(estimate.partsAmount)} />
              <Info label="Tax & Discount" value={`${formatCurrency(estimate.taxAmount)} / -${formatCurrency(estimate.discountAmount)}`} />
              <Info label="Final Estimate" value={<span className="font-bold text-slate-800">{formatCurrency(estimate.totalAmount)}</span>} />
            </CardContent>
          </Card>

          {/* Customer, Ticket, Device and Problem Details */}
          {ticket && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-bold text-slate-500">Customer & Ticket Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div>
                    <span className="text-slate-500 font-medium">Customer:</span>{" "}
                    <span className="font-semibold text-slate-800">{ticket.customer?.fullName}</span>
                  </div>
                  {ticket.customer?.phone && (
                    <div>
                      <span className="text-slate-500 font-medium">Phone:</span>{" "}
                      <span className="text-slate-700">{ticket.customer.phone}</span>
                    </div>
                  )}
                  {ticket.customer?.email && (
                    <div>
                      <span className="text-slate-500 font-medium">Email:</span>{" "}
                      <span className="text-slate-700">{ticket.customer.email}</span>
                    </div>
                  )}
                  <hr className="border-slate-100 my-2" />
                  <div>
                    <span className="text-slate-500 font-medium">Ticket ID / Code:</span>{" "}
                    <span className="font-semibold text-slate-800">{ticket.ticketNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Ticket Title:</span>{" "}
                    <span className="text-slate-700">{ticket.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Priority:</span>{" "}
                    <span className="font-semibold text-slate-800">{ticket.priority}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-bold text-slate-500">Device & Problems Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {device ? (
                    <>
                      <div>
                        <span className="text-slate-500 font-medium">Item Type:</span>{" "}
                        <span className="font-semibold text-slate-800">{device.itemType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Brand & Model:</span>{" "}
                        <span className="text-slate-700">{device.brand} {device.model}</span>
                      </div>
                      {(device.serialNumber || device.imei) && (
                        <div>
                          <span className="text-slate-500 font-medium">SN / IMEI:</span>{" "}
                          <span className="text-slate-700 font-mono text-xs">{device.serialNumber || device.imei}</span>
                        </div>
                      )}
                      {device.condition && (
                        <div>
                          <span className="text-slate-500 font-medium">Intake Condition:</span>{" "}
                          <span className="text-slate-700 text-xs">{device.condition}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No device details found.</p>
                  )}
                  <hr className="border-slate-100 my-2" />
                  <div>
                    <span className="text-slate-500 font-medium">Problem Description:</span>
                    <p className="text-slate-700 text-xs mt-1 bg-slate-50 p-2 rounded max-h-16 overflow-y-auto">
                      {ticket.description || "No description provided"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Admin Comparison vs Actual Cost Variance Console */}
          {ticket && (
            <Card className="border-indigo-100 bg-indigo-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-black tracking-wide text-indigo-700 flex items-center gap-1.5">
                  Cost Variance Console (Estimated vs Actual)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Estimated Cost</p>
                    <p className="text-base font-bold text-slate-800 mt-1">{formatCurrency(estimatedCost)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Approved Cost</p>
                    <p className="text-base font-bold text-slate-800 mt-1">{formatCurrency(approvedCost)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Actual Cost</p>
                    <p className="text-base font-bold text-slate-800 mt-1">{formatCurrency(actualCost)}</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border shadow-sm",
                    variance > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  )}>
                    <p className="text-[10px] font-bold uppercase">Cost Variance</p>
                    <p className="text-base font-black font-mono mt-1">
                      {variance > 0 ? "+" : ""}{formatCurrency(variance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnosis & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs uppercase font-bold text-slate-500">Technician Repair Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-700 space-y-2">
                <div>
                  <span className="font-semibold text-slate-600 block">Diagnosis:</span>
                  <p className="mt-1 bg-slate-50 p-2.5 rounded min-h-12 italic text-slate-800">
                    {ticket?.diagnosis || "No diagnosis logged yet."}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 block">Repair notes:</span>
                  <p className="mt-1 bg-slate-50 p-2.5 rounded min-h-12 italic text-slate-800">
                    {ticket?.repairNotes || "No technical notes logged yet."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs uppercase font-bold text-slate-500">Admin Estimate Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-700">
                <span className="font-semibold text-slate-600 block">Estimate notes:</span>
                <p className="mt-1 bg-slate-50 p-2.5 rounded min-h-12 italic text-slate-800">
                  {estimate.notes || "No estimate notes provided."}
                </p>
                {estimate.approvedAt && (
                  <div className="mt-4 text-[11px] text-slate-500">
                    Approved date: {new Date(estimate.approvedAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Estimate Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>Item</Th>
                    <Th>Type</Th>
                    <Th>Quantity</Th>
                    <Th>Unit</Th>
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || index}>
                      <Td>{item.name}</Td>
                      <Td>{item.itemType}</Td>
                      <Td>{String(item.quantity)}</Td>
                      <Td>{formatCurrency(item.unitAmount)}</Td>
                      <Td>{formatCurrency(item.totalAmount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
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
