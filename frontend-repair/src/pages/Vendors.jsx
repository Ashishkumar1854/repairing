import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { repairApi, vendorsApi } from "@/services/modules";
import { unwrapArray } from "@/utils/cn";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { useState } from "react";

const dispatchableStatuses = ["APPROVED", "IN_REPAIR", "WAITING_PARTS"];
const updatableJobStatuses = ["DISPATCHED", "IN_PROGRESS", "WAITING_VENDOR_QUOTE"];

export function Vendors() {
  const queryClient = useQueryClient();
  const vendorsQuery = useQuery({ queryKey: ["vendors"], queryFn: () => vendorsApi.list() });
  const jobsQuery = useQuery({ queryKey: ["vendors", "jobs"], queryFn: () => vendorsApi.jobs() });
  const ticketsQuery = useQuery({ queryKey: ["repair"], queryFn: () => repairApi.list({ limit: 100 }) });
  const vendors = unwrapArray(vendorsQuery.data, ["vendors"]);
  const jobs = unwrapArray(jobsQuery.data, ["vendorRepairJobs", "jobs"]);
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]);
  const custodyQueries = useQueries({
    queries: tickets.map((ticket) => ({
      queryKey: ["repair", ticket.id, "current-custody"],
      queryFn: () => repairApi.currentCustody(ticket.id),
      enabled: Boolean(ticket.id),
    })),
  });
  const ticketsWithCustody = tickets.map((ticket, index) => mergeTicketCustody(ticket, custodyQueries[index]?.data));
  const dispatchableTickets = ticketsWithCustody.filter((ticket) => dispatchableStatuses.includes(ticket.status) && ticket.currentHolderType === "TECHNICIAN");
  const updatableJobs = jobs.filter((job) => updatableJobStatuses.includes(job.status));
  const receivableJobs = jobs.filter((job) => job.status === "COMPLETED");
  const timelineRows = jobs.flatMap((job) =>
    (job.statusLogs || job.logs || []).map((log, index) => ({ job, log, key: log.id || `${job.id}-${index}` }))
  );

  const mutation = useNotifyMutation({ mutationFn: vendorsApi.create, successMessage: "Vendor created.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors"] }) });
  const dispatch = useNotifyMutation({ mutationFn: ({ ticketId, payload }) => repairApi.vendorDispatch(ticketId, payload), successMessage: "Repair dispatched to vendor.", onSuccess: () => queryClient.invalidateQueries() });
  const update = useNotifyMutation({ mutationFn: ({ jobId, payload }) => vendorsApi.updateJob(jobId, payload), successMessage: "Vendor job status updated.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors", "jobs"] }) });
  const receive = useNotifyMutation({ mutationFn: ({ jobId, payload }) => vendorsApi.receiveJob(jobId, payload), successMessage: "Vendor repair received.", onSuccess: () => queryClient.invalidateQueries() });
  const costs = useNotifyMutation({ mutationFn: ({ jobId, payload }) => vendorsApi.costs(jobId, payload), successMessage: "Vendor cost recorded.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors", "jobs"] }) });

  return (
    <>
      <PageHeader title="Vendors" description="Vendor list, vendor details, vendor repairs, and vendor performance." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader><CardTitle>Vendor List</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <thead><tr><Th>Name</Th><Th>Phone</Th><Th>Email</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <Td>{vendor.name}</Td>
                      <Td>{vendor.phone || "Not set"}</Td>
                      <Td>{vendor.email || "Not set"}</Td>
                      <Td><StatusBadge status={vendor.isActive === false ? "CANCELLED" : "APPROVED"} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!vendors.length ? <div className="p-5"><EmptyState title="No vendors" description="Create a vendor to enable outsource repair workflows." /></div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vendor Repair Jobs</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <thead><tr><Th>Job</Th><Th>Ticket</Th><Th>Vendor</Th><Th>Status</Th><Th>Cost Status</Th></tr></thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <Td>{job.externalRef || job.externalReference || job.jobNumber || job.id}</Td>
                      <Td>{job.ticket?.ticketNumber || job.repairTicket?.ticketNumber || job.repairTicketId}</Td>
                      <Td>{job.vendor?.name || job.vendorId}</Td>
                      <Td><StatusBadge status={job.status} /></Td>
                      <Td><StatusBadge status={job.costStatus} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!jobs.length ? <div className="p-5"><EmptyState title="No vendor repair jobs" description="Vendor dispatches from technician custody will appear here." /></div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vendor Status Timeline</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <thead><tr><Th>Job</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
                <tbody>
                  {timelineRows.map(({ job, log, key }) => (
                    <tr key={key}>
                      <Td>{job.externalRef || job.id}</Td>
                      <Td><StatusBadge status={log.status || log.toStatus} /></Td>
                      <Td>{log.createdAt || log.updatedAt || "Not set"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {!timelineRows.length ? <div className="p-5"><EmptyState title="No status timeline" description="Backend status logs will appear after vendor status changes." /></div> : null}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader><CardTitle>Add Vendor</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                mutation.mutate({
                  name: form.get("name"),
                  phone: form.get("phone") || undefined,
                  email: form.get("email") || undefined,
                  address: form.get("address") || undefined,
                });
              }}>
                <Input name="name" placeholder="Vendor name" required />
                <Input name="phone" placeholder="Phone" />
                <Input name="email" placeholder="Email" />
                <Input name="address" placeholder="Address" />
                <Button className="w-full" disabled={mutation.isPending}>Create Vendor</Button>
              </form>
            </CardContent>
          </Card>

          <VendorAction title="Vendor Dispatch Workflow" pending={dispatch.isPending} onSubmit={(form) => dispatch.mutate({ ticketId: form.get("ticketId"), payload: { vendorId: form.get("vendorId"), externalRef: form.get("externalRef") || undefined, issueDescription: form.get("issueDescription") || undefined, dispatchNotes: form.get("dispatchNotes") || undefined, expectedReturnAt: form.get("expectedReturnAt") || undefined, estimatedCost: form.get("estimatedCost") ? Number(form.get("estimatedCost")) : undefined, currentLocation: form.get("currentLocation") || undefined } })} tickets={dispatchableTickets} vendors={vendors} />
          <JobAction title="Vendor Status Update" jobs={updatableJobs} pending={update.isPending} emptyMessage="Status updates are available for DISPATCHED, IN_PROGRESS, or WAITING_VENDOR_QUOTE jobs." onSubmit={(form) => update.mutate({ jobId: form.get("jobId"), payload: { status: form.get("status"), vendorDiagnosis: form.get("vendorDiagnosis") || undefined, vendorResolution: form.get("vendorResolution") || undefined, notes: form.get("notes") || undefined } })} status />
          <JobAction title="Vendor Receive Workflow" jobs={receivableJobs} pending={receive.isPending} emptyMessage="Vendor receive is available only after a job is marked COMPLETED." onSubmit={(form) => receive.mutate({ jobId: form.get("jobId"), payload: { nextTicketStatus: form.get("nextTicketStatus"), vendorResolution: form.get("vendorResolution") || undefined, currentLocation: form.get("currentLocation") || "Reception", notes: form.get("notes") || undefined } })} receive />
          <JobAction title="Vendor Cost Entry" jobs={jobs} pending={costs.isPending} onSubmit={(form) => costs.mutate({ jobId: form.get("jobId"), payload: { estimatedCost: form.get("estimatedCost") ? Number(form.get("estimatedCost")) : undefined, approvedCost: form.get("approvedCost") ? Number(form.get("approvedCost")) : undefined, finalCost: form.get("finalCost") ? Number(form.get("finalCost")) : undefined, costStatus: form.get("costStatus"), notes: form.get("notes") || undefined } })} cost />
        </div>
      </div>
    </>
  );
}

function VendorAction({ title, pending, onSubmit, tickets, vendors }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}>
          <Select name="ticketId">{tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketNumber}</option>)}</Select>
          <Select name="vendorId">{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</Select>
          <Input name="externalRef" placeholder="External reference" />
          <Textarea name="issueDescription" placeholder="Issue description" />
          <Textarea name="dispatchNotes" placeholder="Dispatch notes" />
          <Input name="expectedReturnAt" type="datetime-local" />
          <Input name="estimatedCost" type="number" step="0.01" placeholder="Estimated cost" />
          <Input name="currentLocation" placeholder="Current location" />
          {!tickets.length ? <p className="text-sm text-[var(--muted)]">Dispatch requires an approved or in-repair ticket in technician custody.</p> : null}
          <Button className="w-full" disabled={pending || !tickets.length || !vendors.length}>{title}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function JobAction({ title, jobs, pending, onSubmit, status, cost, receive, emptyMessage }) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const selectedJob = jobs.find((job) => job.id === selectedJobId) || jobs[0];
  const statusOptions = status ? vendorStatusTargets(selectedJob?.status) : [];

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}>
          <Select name="jobId" value={selectedJob?.id || ""} onChange={(event) => setSelectedJobId(event.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.externalRef || job.externalReference || job.jobNumber || job.id}</option>)}</Select>
          {status ? <Select name="status">{statusOptions.map((option) => <option key={option}>{option}</option>)}</Select> : null}
          {status ? <Textarea name="vendorDiagnosis" placeholder="Vendor diagnosis" /> : null}
          {status || receive ? <Textarea name="vendorResolution" placeholder="Vendor resolution" /> : null}
          {receive ? <Select name="nextTicketStatus"><option>IN_REPAIR</option><option>READY_FOR_DELIVERY</option></Select> : null}
          {receive ? <Input name="currentLocation" placeholder="Current location" defaultValue="Reception" /> : null}
          {cost ? <Input name="estimatedCost" type="number" step="0.01" placeholder="Estimated cost" /> : null}
          {cost ? <Input name="approvedCost" type="number" step="0.01" placeholder="Approved cost" /> : null}
          {cost ? <Input name="finalCost" type="number" step="0.01" placeholder="Final cost" /> : null}
          {cost ? <Select name="costStatus"><option>ESTIMATED</option><option>APPROVED</option><option>INVOICED</option><option>PAID</option><option>CANCELLED</option></Select> : null}
          <Textarea name="notes" placeholder="Notes" />
          {!jobs.length && emptyMessage ? <p className="text-sm text-[var(--muted)]">{emptyMessage}</p> : null}
          <Button className="w-full" disabled={pending || !jobs.length}>{title}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function vendorStatusTargets(status) {
  if (status === "DISPATCHED") return ["IN_PROGRESS", "WAITING_VENDOR_QUOTE", "COMPLETED", "CANCELLED"];
  if (status === "IN_PROGRESS") return ["WAITING_VENDOR_QUOTE", "COMPLETED", "CANCELLED"];
  if (status === "WAITING_VENDOR_QUOTE") return ["IN_PROGRESS", "COMPLETED", "CANCELLED"];
  return [];
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
