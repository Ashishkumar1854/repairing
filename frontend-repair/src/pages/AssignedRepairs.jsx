import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Field } from "@/components/ui/Form";
import { Table, Td, Th } from "@/components/ui/Table";
import { assignmentsApi, repairApi, inventoryApi } from "@/services/modules";
import { cn, formatDate, formatCurrency, unwrapArray } from "@/utils/cn";
import { ticketLabel } from "@/utils/ticketLabel";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import {
  Play,
  Pause,
  CheckCircle,
  Save,
  Plus,
  X,
  Phone,
  User,
  Mail,
  BadgeAlert,
  Info,
  DollarSign
} from "lucide-react";

function getTicket(assignment) {
  return assignment.ticket || assignment.repairTicket || assignment.repair || assignment;
}

export function AssignedRepairs() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("assigned");
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // 1. Fetch technician's assignment queue based on tab
  const queueQuery = useQuery({
    queryKey: ["technician-assigned-repairs", activeTab],
    queryFn: () => assignmentsApi.queue({ statusGroup: activeTab, page: 1, limit: 50, sort: "priority" }),
  });
  const assignments = queueQuery.data?.data?.assignments || [];

  // 2. Fetch selected ticket's complete execution details
  const ticketDetailQuery = useQuery({
    queryKey: ["repair-ticket-detail", selectedTicketId],
    queryFn: () => repairApi.get(selectedTicketId),
    enabled: Boolean(selectedTicketId),
  });
  const ticket = ticketDetailQuery.data?.data?.ticket || ticketDetailQuery.data?.data || null;

  // 3. Fetch inventory items for parts consumption
  const itemsQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.list(),
  });
  const items = unwrapArray(itemsQuery.data, ["items"]);

  // 4. Fetch selected ticket's parts usage history
  const partsUsageQuery = useQuery({
    queryKey: ["repair-ticket-parts-usage", selectedTicketId],
    queryFn: () => repairApi.partsUsage(selectedTicketId),
    enabled: Boolean(selectedTicketId),
  });
  const partsUsages = unwrapArray(partsUsageQuery.data, ["partsUsage", "usages", "usage"]);

  // Form states for execution details
  const [formState, setFormState] = useState({
    diagnosis: "",
    repairNotes: "",
    workPerformed: "",
    laborCost: 0,
    estimatedCompletionTime: "",
    repairRemarks: "",
    internalNotes: "",
  });

  // Form states for parts usage input
  const [partInput, setPartInput] = useState({
    inventoryItemId: "",
    quantity: 1,
    notes: "",
  });

  // Automatically update form fields when selected ticket details load
  useEffect(() => {
    if (ticket) {
      setFormState({
        diagnosis: ticket.diagnosis || "",
        repairNotes: ticket.repairNotes || "",
        workPerformed: ticket.workPerformed || "",
        laborCost: ticket.laborCost || 0,
        estimatedCompletionTime: ticket.estimatedCompletionTime
          ? new Date(ticket.estimatedCompletionTime).toISOString().slice(0, 16)
          : "",
        repairRemarks: ticket.repairRemarks || "",
        internalNotes: ticket.internalNotes || "",
      });
    }
  }, [ticket]);

  // Set first inventory item as default when items are loaded
  useEffect(() => {
    if (items.length > 0 && !partInput.inventoryItemId) {
      setPartInput((prev) => ({ ...prev, inventoryItemId: items[0].id }));
    }
  }, [items, partInput.inventoryItemId]);

  // Mutation: Update Status
  const statusMutation = useNotifyMutation({
    mutationFn: ({ status, reason }) => repairApi.updateStatus(selectedTicketId, { status, reason }),
    successMessage: "Repair status updated.",
    onSuccess: () => {
      queryClient.invalidateQueries(["technician-assigned-repairs", activeTab]);
      queryClient.invalidateQueries(["repair-ticket-detail", selectedTicketId]);
    },
  });

  // Mutation: Save Execution Details
  const saveExecutionMutation = useNotifyMutation({
    mutationFn: (payload) => repairApi.updateExecution(selectedTicketId, payload),
    successMessage: "Execution details saved.",
    onSuccess: () => {
      queryClient.invalidateQueries(["repair-ticket-detail", selectedTicketId]);
    },
  });

  // Mutation: Consume Parts
  const consumePartsMutation = useNotifyMutation({
    mutationFn: (payload) => repairApi.consumeParts(selectedTicketId, payload),
    successMessage: "Parts consumed successfully.",
    onSuccess: () => {
      setPartInput((prev) => ({ ...prev, quantity: 1, notes: "" }));
      queryClient.invalidateQueries(["repair-ticket-parts-usage", selectedTicketId]);
      queryClient.invalidateQueries(["repair-ticket-detail", selectedTicketId]);
    },
  });

  const handleSaveExecution = (e) => {
    e.preventDefault();
    saveExecutionMutation.mutate({
      diagnosis: formState.diagnosis || null,
      repairNotes: formState.repairNotes || null,
      workPerformed: formState.workPerformed || null,
      laborCost: formState.laborCost ? Number(formState.laborCost) : 0,
      estimatedCompletionTime: formState.estimatedCompletionTime
        ? new Date(formState.estimatedCompletionTime).toISOString()
        : null,
      repairRemarks: formState.repairRemarks || null,
      internalNotes: formState.internalNotes || null,
    });
  };

  const handleConsumePart = (e) => {
    e.preventDefault();
    if (!partInput.inventoryItemId) return;
    consumePartsMutation.mutate({
      parts: [
        {
          inventoryItemId: partInput.inventoryItemId,
          quantity: Number(partInput.quantity),
          notes: partInput.notes || undefined,
        },
      ],
    });
  };

  const tabs = [
    { id: "assigned", name: "Assigned" },
    { id: "active", name: "Active" },
    { id: "pending_review", name: "Pending Review" },
    { id: "completed", name: "Completed" },
  ];

  return (
    <div>
      <PageHeader
        title="Technician Workspace"
        description="Manage assigned repairs, log diagnostics, consume parts, and submit for quality review."
      />

      {/* Tab Header Navigation */}
      <div className="flex border-b border-[var(--border)] mb-6 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedTicketId(null);
            }}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors",
              activeTab === tab.id
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className={selectedTicketId ? "grid grid-cols-1 lg:grid-cols-12 gap-6" : "space-y-6"}>
        {/* Left Side: DataTable List of Assignments */}
        <div className={selectedTicketId ? "lg:col-span-6" : "w-full"}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Repairs Queue ({tabs.find((t) => t.id === activeTab)?.name})</CardTitle>
            </CardHeader>
            <DataTable
              rows={assignments}
              isLoading={queueQuery.isLoading}
              error={queueQuery.error}
              onRetry={queueQuery.refetch}
              searchable
              emptyTitle="No repairs found"
              emptyDescription={`There are currently no tickets matching "${tabs.find((t) => t.id === activeTab)?.name}" queue status.`}
              columns={[
                {
                  key: "repair",
                  header: "Repair",
                  render: (assignment) => {
                    const ticket = getTicket(assignment);
                    return (
                      <div>
                        <p className="font-semibold">{ticketLabel(ticket)}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{ticket.title}</p>
                      </div>
                    );
                  },
                },
                {
                  key: "status",
                  header: "Status",
                  render: (assignment) => <StatusBadge status={getTicket(assignment).status} />,
                },
                {
                  key: "priority",
                  header: "Priority",
                  render: (assignment) => {
                    const priority = getTicket(assignment).priority || "NORMAL";
                    return (
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                          priority === "URGENT" && "bg-red-100 text-red-800",
                          priority === "HIGH" && "bg-amber-100 text-amber-800",
                          priority === "NORMAL" && "bg-slate-100 text-slate-800",
                          priority === "LOW" && "bg-green-100 text-green-800"
                        )}
                      >
                        {priority}
                      </span>
                    );
                  },
                },
                {
                  key: "assignedAt",
                  header: "Assigned",
                  render: (assignment) => formatDate(assignment.assignedAt || assignment.createdAt),
                },
                {
                  key: "actions",
                  header: "Action",
                  render: (assignment) => {
                    const ticket = getTicket(assignment);
                    const isCurrent = selectedTicketId === ticket.id;
                    return (
                      <Button
                        size="sm"
                        variant={isCurrent ? "secondary" : "primary"}
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        {isCurrent ? "Active" : "Manage"}
                      </Button>
                    );
                  },
                },
              ]}
            />
          </Card>
        </div>

        {/* Right Side: Execution Detail Workspace Panel */}
        {selectedTicketId && (
          <div className="lg:col-span-6 space-y-6">
            {ticketDetailQuery.isLoading ? (
              <Card>
                <CardContent className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
                  <p className="text-sm text-slate-500">Loading execution panel...</p>
                </CardContent>
              </Card>
            ) : !ticket ? (
              <Card>
                <CardContent className="py-6 text-center text-slate-500">
                  Failed to fetch ticket detail. Select another ticket.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6 border border-[var(--border)] rounded-xl bg-white p-6 shadow-sm max-h-[85vh] overflow-y-auto sticky top-6">
                {/* Header Section */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">{ticketLabel(ticket)}</h2>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{ticket.title}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Device and Customer Context Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Customer Context</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        <span>{ticket.customer?.fullName}</span>
                      </div>
                      {ticket.customer?.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600 hover:text-[var(--primary)]">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          <a href={`tel:${ticket.customer.phone}`}>{ticket.customer.phone}</a>
                        </div>
                      )}
                      {ticket.customer?.email && (
                        <div className="flex items-center gap-1.5 text-slate-600 hover:text-[var(--primary)]">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          <a href={`mailto:${ticket.customer.email}`}>{ticket.customer.email}</a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Device Details</p>
                    <div className="space-y-1">
                      {ticket.items && ticket.items[0] ? (
                        <>
                          <p className="font-semibold text-slate-800">
                            {ticket.items[0].brand} {ticket.items[0].model} ({ticket.items[0].itemType})
                          </p>
                          {(ticket.items[0].serialNumber || ticket.items[0].imei) && (
                            <p className="text-xs text-slate-500">
                              SN/IMEI: {ticket.items[0].serialNumber || ticket.items[0].imei}
                            </p>
                          )}
                          {ticket.items[0].condition && (
                            <p className="text-xs text-slate-500">Condition: {ticket.items[0].condition}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-500 italic">No device item set</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Transitions Control Panel */}
                <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-slate-500" />
                    Operational Status Controls
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {/* START REPAIR */}
                    {(ticket.status === "DIAGNOSING" || ticket.status === "APPROVED") && (
                      <Button
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            status: "IN_REPAIR",
                            reason: "Technician began repairing device.",
                          })
                        }
                        className="bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Start Repair
                      </Button>
                    )}

                    {/* PAUSE WORK (Waiting Parts) */}
                    {ticket.status === "IN_REPAIR" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            status: "WAITING_PARTS",
                            reason: "Awaiting replacement parts from inventory.",
                          })
                        }
                      >
                        <Pause className="h-4 w-4" />
                        Pause Work
                      </Button>
                    )}

                    {/* RESUME WORK (from Pause or Vendor) */}
                    {(ticket.status === "WAITING_PARTS" || ticket.status === "SENT_TO_VENDOR") && (
                      <Button
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            status: "IN_REPAIR",
                            reason: "Technician resumed repairing device.",
                          })
                        }
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Resume Work
                      </Button>
                    )}

                    {/* SUBMIT FOR REVIEW */}
                    {(ticket.status === "IN_REPAIR" || ticket.status === "SENT_TO_VENDOR") && (
                      <Button
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            status: "READY_FOR_REVIEW",
                            reason: "Repair completed. Submitted for Admin review.",
                          })
                        }
                        className="bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Submit for Review
                      </Button>
                    )}

                    {/* RESUME WORK IF PENDING REVIEW OR DELIVERED */}
                    {ticket.status === "READY_FOR_REVIEW" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            status: "IN_REPAIR",
                            reason: "Reopened from review to make additional adjustments.",
                          })
                        }
                      >
                        Reopen to Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Financial Summary Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-100 p-4 rounded-lg">
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Labor Cost</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(ticket.laborCost)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Parts Cost</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(ticket.partsCost)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Vendor Cost</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(ticket.vendorCost)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total Cost</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(ticket.totalRepairCost)}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Invoice Amount</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(ticket.finalInvoiceAmount)}</p>
                  </div>
                  <div className="bg-indigo-50 p-2.5 rounded text-center">
                    <p className="text-[10px] uppercase font-bold text-indigo-500">Profit Est.</p>
                    <p className="text-sm font-bold text-indigo-700 mt-1">{formatCurrency(ticket.profitEstimate)}</p>
                  </div>
                </div>

                {/* Execution Details Form */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-700">
                      <Save className="h-4 w-4" />
                      Technician Repair Form
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveExecution} className="space-y-4">
                      <Field label="Diagnosis & Issue Findings">
                        <Textarea
                          placeholder="Describe diagnosed issues and hardware/software faults..."
                          value={formState.diagnosis}
                          onChange={(e) => setFormState({ ...formState, diagnosis: e.target.value })}
                        />
                      </Field>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Labor Cost ($)">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formState.laborCost}
                            onChange={(e) => setFormState({ ...formState, laborCost: e.target.value })}
                          />
                        </Field>

                        <Field label="Est. Completion Time">
                          <Input
                            type="datetime-local"
                            value={formState.estimatedCompletionTime}
                            onChange={(e) => setFormState({ ...formState, estimatedCompletionTime: e.target.value })}
                          />
                        </Field>
                      </div>

                      <Field label="Work Performed">
                        <Textarea
                          placeholder="Describe the action and repairs performed on the device..."
                          value={formState.workPerformed}
                          onChange={(e) => setFormState({ ...formState, workPerformed: e.target.value })}
                        />
                      </Field>

                      <Field label="Repair Notes & Steps">
                        <Textarea
                          placeholder="Internal step-by-step repair logs..."
                          value={formState.repairNotes}
                          onChange={(e) => setFormState({ ...formState, repairNotes: e.target.value })}
                        />
                      </Field>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Repair Remarks (Customer Facing)">
                          <Textarea
                            placeholder="Add remarks that will display on the customer invoice..."
                            value={formState.repairRemarks}
                            onChange={(e) => setFormState({ ...formState, repairRemarks: e.target.value })}
                          />
                        </Field>

                        <Field label="Internal Notes (Staff Only)">
                          <Textarea
                            placeholder="Private technical insights or warnings..."
                            value={formState.internalNotes}
                            onChange={(e) => setFormState({ ...formState, internalNotes: e.target.value })}
                          />
                        </Field>
                      </div>

                      <Button
                        type="submit"
                        disabled={saveExecutionMutation.isPending}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {saveExecutionMutation.isPending ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Execution Details
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Parts Usage Console Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-700">
                      <Plus className="h-4 w-4 text-[var(--primary)]" />
                      Parts Usage Console
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add Part Form */}
                    <form onSubmit={handleConsumePart} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="sm:col-span-6">
                        <Field label="Select Inventory Part">
                          <Select
                            value={partInput.inventoryItemId}
                            onChange={(e) => setPartInput({ ...partInput, inventoryItemId: e.target.value })}
                          >
                            <option value="" disabled>-- Select Part --</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.sku} · {item.partName} ({item.stockQuantity} in stock)
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>

                      <div className="sm:col-span-3">
                        <Field label="Quantity">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={partInput.quantity}
                            onChange={(e) => setPartInput({ ...partInput, quantity: e.target.value })}
                          />
                        </Field>
                      </div>

                      <div className="sm:col-span-12 mt-2">
                        <Field label="Parts Usage Notes (optional)">
                          <Input
                            placeholder="Reason or notes for parts utilization..."
                            value={partInput.notes}
                            onChange={(e) => setPartInput({ ...partInput, notes: e.target.value })}
                          />
                        </Field>
                      </div>

                      <div className="sm:col-span-12 mt-2">
                        <Button
                          type="submit"
                          disabled={consumePartsMutation.isPending || !partInput.inventoryItemId}
                          className="w-full"
                        >
                          {consumePartsMutation.isPending ? "Consuming..." : "Consume Parts"}
                        </Button>
                      </div>
                    </form>

                    {/* Parts History table */}
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                        Consumed Parts List
                      </h4>
                      {partsUsages.length === 0 ? (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded text-center">
                          No parts have been consumed for this repair ticket yet.
                        </p>
                      ) : (
                        <div className="border border-slate-100 rounded-md overflow-hidden">
                          <Table>
                            <thead>
                              <tr className="bg-slate-50">
                                <Th className="py-2 text-[11px]">Part</Th>
                                <Th className="py-2 text-[11px] text-right">Qty</Th>
                                <Th className="py-2 text-[11px] text-right">Unit Cost</Th>
                                <Th className="py-2 text-[11px] text-right">Total</Th>
                              </tr>
                            </thead>
                            <tbody>
                              {partsUsages.map((usage, idx) => (
                                <tr key={usage.id || idx} className="border-t border-slate-100">
                                  <Td className="py-2 text-xs font-medium">
                                    <div>
                                      {usage.inventoryItem?.partName || usage.partName}
                                      {usage.notes && (
                                        <span className="block text-[10px] text-slate-500 font-normal italic">
                                          Note: {usage.notes}
                                        </span>
                                      )}
                                    </div>
                                  </Td>
                                  <Td className="py-2 text-xs text-right text-slate-600">
                                    {String(usage.quantity)}
                                  </Td>
                                  <Td className="py-2 text-xs text-right text-slate-600 font-mono">
                                    {formatCurrency(usage.unitCost)}
                                  </Td>
                                  <Td className="py-2 text-xs text-right font-bold font-mono">
                                    {formatCurrency(usage.totalCost || Number(usage.quantity) * Number(usage.unitCost))}
                                  </Td>
                                </tr>
                              ))}
                              <tr className="bg-slate-50/50 border-t border-slate-200">
                                <td colSpan={3} className="py-2 px-3 text-xs font-bold text-right text-slate-700">
                                  Cumulative Parts Cost:
                                </td>
                                <td className="py-2 px-3 text-xs font-extrabold text-right font-mono text-indigo-700">
                                  {formatCurrency(ticket.partsCost)}
                                </td>
                              </tr>
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

