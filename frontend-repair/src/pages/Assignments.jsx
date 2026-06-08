import { useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { Timeline } from "@/components/ui/Timeline";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { assignmentsApi, repairApi } from "@/services/modules";
import { unwrapArray } from "@/utils/cn";
import { displayValue } from "@/utils/data";
import { isActiveAssignment, isTerminalTicketStatus } from "@/utils/workflow";

export function Assignments() {
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const queueQuery = useQuery({ queryKey: ["assignments", "queue"], queryFn: () => assignmentsApi.queue() });
  const dashboardQuery = useQuery({ queryKey: ["assignments", "dashboard"], queryFn: () => assignmentsApi.dashboard() });
  const ticketsQuery = useQuery({ queryKey: ["repair"], queryFn: () => repairApi.list() });
  const queue = unwrapArray(queueQuery.data, ["assignments", "tickets"]);
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]);
  const dashboard = dashboardQuery.data?.data || {};
  const activeTicketId = selectedTicketId || tickets[0]?.id || "";
  const historyQuery = useQuery({
    queryKey: ["assignments", activeTicketId, "history"],
    queryFn: () => repairApi.assignments(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const history = unwrapArray(historyQuery.data, ["assignments", "history", "logs"]);
  const assignmentQueries = useQueries({
    queries: tickets.map((ticket) => ({
      queryKey: ["assignments", ticket.id, "candidate-history"],
      queryFn: () => repairApi.assignments(ticket.id),
      enabled: Boolean(ticket.id),
    })),
  });
  const assignmentRecordsByTicket = new Map(
    tickets.map((ticket, index) => [
      ticket.id,
      unwrapArray(assignmentQueries[index]?.data, ["assignments", "history", "logs"]),
    ])
  );
  const ticketHasActiveAssignment = (ticket) => (assignmentRecordsByTicket.get(ticket.id) || []).some(isActiveAssignment);
  const technicians = uniqueTechnicians([
    ...queue,
    ...history,
    ...[...assignmentRecordsByTicket.values()].flat(),
    ...tickets.flatMap((ticket) => ticket.assignments || []),
  ]);
  const assignableTickets = tickets.filter((ticket) => !isTerminalTicketStatus(ticket.status) && !ticketHasActiveAssignment(ticket));
  const reassignableTickets = tickets.filter((ticket) => !isTerminalTicketStatus(ticket.status) && ticketHasActiveAssignment(ticket));
  const mutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.assign(ticketId, payload),
    successMessage: "Technician assigned.",
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const reassign = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.reassign(ticketId, payload),
    successMessage: "Technician reassigned.",
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <>
      <PageHeader title="Assignments" description="Assignments, assign technician, reassign technician, technician workload, and performance." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(dashboard)
              .filter(([, value]) => typeof value !== "object")
              .slice(0, 4)
              .map(([key, value]) => (
                <Card key={key}>
                  <CardContent>
                    <p className="text-xs uppercase text-slate-500">{key}</p>
                    <p className="mt-2 text-2xl font-bold">{displayValue(value)}</p>
                  </CardContent>
                </Card>
              ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Technician Workload</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <thead><tr><Th>Assigned Repair</Th><Th>Status</Th><Th>Priority</Th><Th>Workload</Th></tr></thead>
                <tbody>
                  {queue.map((item, index) => (
                    <tr key={item.id || index}>
                      <Td>{displayValue(item.ticket?.ticketNumber || item.ticketNumber, "Repair")}</Td>
                      <Td><StatusBadge status={item.ticket?.status || item.status || "ASSIGNED"} /></Td>
                      <Td>{displayValue(item.ticket?.priority, "NORMAL")}</Td>
                      <Td>{displayValue(item.status, "Active")}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Assignment History</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={activeTicketId} onChange={(event) => setSelectedTicketId(event.target.value)}>
                {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketNumber}</option>)}
              </Select>
              <Table>
                <thead><tr><Th>Technician</Th><Th>Status</Th><Th>Assigned By</Th><Th>Assigned At</Th></tr></thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={item.id || index}>
                      <Td>{displayValue(item.assignedTo || item.assignedToStaffId)}</Td>
                      <Td><StatusBadge status={item.status || item.type} /></Td>
                      <Td>{displayValue(item.assignedBy || item.assignedByStaffId, "System")}</Td>
                      <Td>{displayValue(item.assignedAt || item.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Timeline items={history.map((item) => ({ ...item, status: item.status || item.type }))} titleKey="status" dateKey="assignedAt" description={(item) => `Technician ${displayValue(item.assignedTo || item.assignedToStaffId, "unknown")}`} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-5">
          <AssignmentForm
            title="Assign Technician"
            emptyMessage="No unassigned, non-terminal repair tickets are available for assignment."
            pending={mutation.isPending}
            technicians={technicians}
            tickets={assignableTickets}
            onSubmit={(ticketId, payload) => mutation.mutate({ ticketId, payload })}
          />
          <AssignmentForm
            title="Reassign Technician"
            emptyMessage="No active assignments are available for reassignment."
            pending={reassign.isPending}
            requireReason
            technicians={technicians}
            tickets={reassignableTickets}
            onSubmit={(ticketId, payload) => reassign.mutate({ ticketId, payload })}
          />
        </div>
      </div>
    </>
  );
}

function AssignmentForm({ title, tickets, technicians, pending, requireReason, emptyMessage, onSubmit }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit(form.get("ticketId"), {
            technicianId: form.get("technicianId"),
            reason: form.get("reason") || undefined,
            notes: form.get("notes"),
          });
        }}>
          <Select name="ticketId" disabled={!tickets.length}>
            {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketNumber}</option>)}
          </Select>
          {!tickets.length ? <p className="text-xs text-[var(--muted)]">{emptyMessage}</p> : null}
          <Select name="technicianId" disabled={!technicians.length}>
            {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
          </Select>
          {!technicians.length ? <p className="text-xs text-[var(--muted)]">No technician records are available from existing assignment APIs yet.</p> : null}
          {requireReason ? <Input name="reason" placeholder="Reassignment reason" required /> : null}
          <Textarea name="notes" placeholder="Assignment notes" />
          <Button className="w-full" disabled={pending || !tickets.length || !technicians.length}>{title}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function uniqueTechnicians(records) {
  const map = new Map();
  for (const record of records) {
    const staff = record.assignedTo || record.technician || record.ticket?.assignments?.[0]?.assignedTo;
    const id = staff?.id || record.assignedToStaffId || record.technicianId;
    const name = staff?.fullName || staff?.name || id;
    if (id) map.set(id, { id, name });
  }
  return [...map.values()];
}
