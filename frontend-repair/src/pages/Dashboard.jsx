import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, CreditCard, KeyRound, PackageCheck, UserCheck, UserPlus, Users, UserX, Wrench } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { analyticsApi, assignmentsApi, staffApi, repairApi } from "@/services/modules";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { formatCurrency, formatDate } from "@/utils/cn";
import { chartRowsFromEnvelope } from "@/utils/data";
import { Table, Td, Th } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QueryState } from "@/components/ui/QueryState";
import { ticketLabel } from "@/utils/ticketLabel";

const colors = ["#1769aa", "#0f9f8f", "#b7791f", "#16794c"];



function metric(data, keys) {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], data);
    if (value !== undefined) return value;
  }
  return 0;
}

export function Dashboard() {
  const { hasRole } = useAuth();

  if (hasRole("TECHNICIAN")) {
    return <TechnicianDashboard />;
  }

  if (hasRole("ADMIN")) {
    return <AdminDashboard />;
  }

  const { data, isLoading } = useQuery({ queryKey: ["analytics", "owner-dashboard"], queryFn: () => analyticsApi.ownerDashboard() });
  const statusQuery = useQuery({ queryKey: ["analytics", "status-breakdown"], queryFn: () => analyticsApi.statusBreakdown() });
  const workloadQuery = useQuery({ queryKey: ["analytics", "technician-workload"], queryFn: () => analyticsApi.technicianWorkload() });
  const dashboard = data?.data || {};
  const statusRows = chartRowsFromEnvelope(statusQuery.data, ["breakdown", "statuses", "rows"]);
  const workloadRows = chartRowsFromEnvelope(workloadQuery.data, ["workload", "technicians", "rows"]);

  return (
    <>
      <PageHeader title="Dashboard" description="Owner dashboard integrated with GET /analytics/dashboard/owner." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Repairs" value={isLoading ? "..." : metric(dashboard, ["repairs.total", "totalRepairs", "repairsTotal"])} detail={`${metric(dashboard, ["repairs.active", "activeRepairs"])} active`} icon={<Wrench className="h-5 w-5" />} />
        <KpiCard label="Revenue Summary" value={formatCurrency(metric(dashboard, ["revenueSummary.totalRevenue", "revenueSummary.collectedRevenue", "totalRevenue", "collectedRevenue", "revenue"]))} detail={`${formatCurrency(metric(dashboard, ["revenueSummary.collectedRevenue", "totalPaymentsCollected"]))} collected`} icon={<CreditCard className="h-5 w-5" />} />
        <KpiCard label="Pending Dues" value={formatCurrency(metric(dashboard, ["revenueSummary.pendingDues", "pendingDues", "outstandingDues"]))} detail="Outstanding customer balance" icon={<BarChart3 className="h-5 w-5" />} />
        <KpiCard label="Inventory Consumption" value={formatCurrency(metric(dashboard, ["inventoryConsumptionValue", "inventoryConsumption"]))} detail="Actual consumed value" icon={<PackageCheck className="h-5 w-5" />} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Technician Utilization</CardTitle></CardHeader>
          <CardContent className="h-80">
            {workloadRows.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={workloadRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#1769aa" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No workload data" description="Technician utilization uses backend workload analytics only." />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Repair KPIs</CardTitle></CardHeader>
          <CardContent className="h-80">
            {statusRows.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusRows} dataKey="value" nameKey="name" outerRadius={105} label>{statusRows.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <EmptyState title="No status data" description="Repair KPI chart uses backend status breakdown only." />}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {(dashboard.recentActivities || []).length ? <Table><thead><tr><Th>Activity</Th><Th>Type</Th><Th>Date</Th></tr></thead><tbody>{dashboard.recentActivities.map((activity, index) => <tr key={activity.id || index}><Td>{activity.title || activity.message || activity.description || "Activity"}</Td><Td>{activity.type || activity.action || "Event"}</Td><Td>{activity.createdAt || activity.timestamp || activity.date}</Td></tr>)}</tbody></Table> : <div className="p-5"><EmptyState title="No recent activity" description="Recent activity will appear when the backend dashboard returns activity rows." /></div>}
        </CardContent>
      </Card>
    </>
  );
}

function TechnicianDashboard() {
  const dashboardQuery = useQuery({ queryKey: ["technician", "dashboard"], queryFn: () => assignmentsApi.dashboard() });
  const queueQuery = useQuery({ queryKey: ["technician", "queue", "dashboard"], queryFn: () => assignmentsApi.queue({ page: 1, limit: 10, sort: "priority" }) });
  const dashboard = dashboardQuery.data?.data?.dashboard || {};
  const assignments = queueQuery.data?.data?.assignments || [];

  return (
    <>
      <PageHeader title="Dashboard" description="Technician dashboard for assigned repairs, estimates, parts usage, and handover work." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Assigned Repairs" value={dashboardQuery.isLoading ? "..." : dashboard.activeAssignments || 0} detail="Open assigned work" icon={<Wrench className="h-5 w-5" />} />
        <KpiCard label="In Repair" value={dashboard.inRepairCount || 0} detail="Tickets currently in repair" icon={<PackageCheck className="h-5 w-5" />} />
        <KpiCard label="Waiting Approval" value={dashboard.waitingApprovalCount || 0} detail="Customer approval pending" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard label="Parts Used" value={dashboard.inventoryConsumption?.usageCount || 0} detail={`${formatCurrency(dashboard.inventoryConsumption?.totalCost || 0)} consumed`} icon={<CreditCard className="h-5 w-5" />} />
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>My Assigned Repairs</CardTitle>
        </CardHeader>
        <QueryState isLoading={queueQuery.isLoading} error={queueQuery.error} isEmpty={!assignments.length} emptyTitle="No assigned repairs" emptyDescription="Assigned repairs will appear here when the shop owner assigns tickets to you.">
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Repair</Th>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                  <Th>Priority</Th>
                  <Th>Assigned</Th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  const ticket = assignment.ticket || {};
                  return (
                    <tr key={assignment.id}>
                      <Td>{ticketLabel(ticket)}</Td>
                      <Td>{ticket.customer?.fullName || "Customer"}</Td>
                      <Td><StatusBadge status={ticket.status} /></Td>
                      <Td>{ticket.priority || "NORMAL"}</Td>
                      <Td>{formatDate(assignment.assignedAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </QueryState>
      </Card>
    </>
  );
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: staffApi.list,
  });

  const ticketsQuery = useQuery({
    queryKey: ["repair", "dashboard-tickets"],
    queryFn: () => repairApi.list({ limit: 100 }),
  });

  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["repair", "dashboard-tickets"] });
  };

  const refreshStaff = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const createMutation = useMutation({
    mutationFn: staffApi.createStaff,
    onSuccess: () => {
      refreshStaff();
      toast.success("Technician created successfully.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to create technician."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => (action === "enable" ? staffApi.enable(id) : staffApi.disable(id)),
    onSuccess: () => {
      refreshStaff();
      toast.success("Staff status updated.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update staff status."),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }) => staffApi.resetPassword(id, { password }),
    onSuccess: () => toast.success("Staff password reset successfully."),
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to reset password."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status, reason }) => repairApi.updateStatus(ticketId, { status, reason }),
    onSuccess: () => {
      refreshDashboard();
      toast.success("Ticket status updated successfully.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update ticket status."),
  });

  const technicians = useMemo(() => staffQuery.data?.data?.staff || [], [staffQuery.data]);
  const tickets = useMemo(() => ticketsQuery.data?.data?.tickets || [], [ticketsQuery.data]);

  const reviewQueue = useMemo(() => {
    return tickets.filter((t) => t.status === "READY_FOR_REVIEW");
  }, [tickets]);

  const pendingTickets = useMemo(() => tickets.filter((t) => t.status === "RECEIVED").length, [tickets]);
  const assignedTickets = useMemo(() => tickets.filter((t) => ["DIAGNOSING", "ESTIMATE_PENDING", "APPROVED", "IN_REPAIR", "WAITING_PARTS", "WAITING_APPROVAL", "SENT_TO_VENDOR"].includes(t.status)).length, [tickets]);
  const readyForReview = useMemo(() => tickets.filter((t) => t.status === "READY_FOR_REVIEW").length, [tickets]);
  const pendingBilling = useMemo(() => tickets.filter((t) => t.status === "READY_FOR_DELIVERY" && (!t.finalInvoiceAmount || Number(t.finalInvoiceAmount) === 0)).length, [tickets]);
  const pendingHandover = useMemo(() => tickets.filter((t) => t.status === "READY_FOR_DELIVERY").length, [tickets]);

  const technicianWorkload = useMemo(() => {
    return technicians.map((tech) => {
      const active = tickets.filter((t) => {
        const isActive = ["DIAGNOSING", "APPROVED", "IN_REPAIR", "WAITING_PARTS", "SENT_TO_VENDOR"].includes(t.status);
        const isAssigned = t.assignments?.some((a) => a.assignedToStaffId === tech.id);
        return isActive && isAssigned;
      }).length;

      const review = tickets.filter((t) => {
        const isReview = t.status === "READY_FOR_REVIEW";
        const isAssigned = t.assignments?.some((a) => a.assignedToStaffId === tech.id);
        return isReview && isAssigned;
      }).length;

      const completed = tickets.filter((t) => {
        const isCompleted = ["READY_FOR_DELIVERY", "DELIVERED", "CLOSED"].includes(t.status);
        const isAssigned = t.assignments?.some((a) => a.assignedToStaffId === tech.id);
        return isCompleted && isAssigned;
      }).length;

      return {
        technicianId: tech.id,
        fullName: tech.fullName,
        email: tech.email,
        activeRepairs: active,
        pendingReview: review,
        completedRepairs: completed,
      };
    });
  }, [technicians, tickets]);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description={`Branch Admin control panel for ${user?.business?.name || "Repair Business"}. Manage your branch technicians and run daily operations.`}
        actions={
          <Link to="/admin/workflow">
            <Button variant="secondary">View Workflow</Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
        <KpiCard
          label="Pending Tickets"
          value={ticketsQuery.isLoading ? "..." : pendingTickets}
          detail="New intake to assign"
          icon={<Wrench className="h-5 w-5 text-blue-500" />}
        />
        <KpiCard
          label="Assigned Tickets"
          value={ticketsQuery.isLoading ? "..." : assignedTickets}
          detail="Repairs in progress"
          icon={<Wrench className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="Ready For Review"
          value={ticketsQuery.isLoading ? "..." : readyForReview}
          detail="Pending admin approval"
          icon={<CheckCircle2 className="h-5 w-5 text-yellow-500" />}
        />
        <KpiCard
          label="Pending Billing"
          value={ticketsQuery.isLoading ? "..." : pendingBilling}
          detail="Unbilled deliveries"
          icon={<CreditCard className="h-5 w-5 text-purple-500" />}
        />
        <KpiCard
          label="Pending Handover"
          value={ticketsQuery.isLoading ? "..." : pendingHandover}
          detail="Ready to deliver"
          icon={<PackageCheck className="h-5 w-5 text-green-500" />}
        />
      </div>

      {/* Quick Operations Links */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Branch Operations Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            <Link to="/repair" className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Manage Repairs</p>
                <p className="text-xs text-slate-500">Tickets & status</p>
              </div>
            </Link>

            <Link to="/customers" className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="rounded-lg bg-green-50 p-3 text-green-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Customers</p>
                <p className="text-xs text-slate-500">Manage profiles</p>
              </div>
            </Link>

            <Link to="/repair/estimates" className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="rounded-lg bg-yellow-50 p-3 text-yellow-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Estimates</p>
                <p className="text-xs text-slate-500">Approve & quote</p>
              </div>
            </Link>

            <Link to="/billing" className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
              <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Billing & Invoices</p>
                <p className="text-xs text-slate-500">Payments & invoices</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Review Queue */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Completed Repairs Review Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <QueryState
            isLoading={ticketsQuery.isLoading}
            error={ticketsQuery.error}
            isEmpty={reviewQueue.length === 0}
            emptyTitle="No repairs pending review"
            emptyDescription="Completed repairs submitted by technicians for review will appear here."
            onRetry={ticketsQuery.refetch}
          >
            <Table>
              <thead>
                <tr>
                  <Th>Ticket</Th>
                  <Th>Customer</Th>
                  <Th>Technician Diagnosis & Notes</Th>
                  <Th>Financial Breakdown</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {reviewQueue.map((ticket) => (
                  <tr key={ticket.id}>
                    <Td>
                      <div className="font-semibold text-slate-900">{ticketLabel(ticket)}</div>
                      <div className="text-xs text-slate-500">{ticket.title}</div>
                    </Td>
                    <Td>
                      <div className="text-sm font-medium text-slate-900">{ticket.customer?.fullName}</div>
                      <div className="text-xs text-slate-500">{ticket.customer?.phone}</div>
                    </Td>
                    <Td>
                      <div className="text-sm"><strong className="text-slate-700">Diagnosis:</strong> {ticket.diagnosis || "No diagnosis details"}</div>
                      {ticket.workPerformed && <div className="text-xs text-slate-600 mt-1"><strong className="text-slate-700">Work:</strong> {ticket.workPerformed}</div>}
                      {ticket.repairNotes && <div className="text-xs text-slate-500 mt-1"><strong className="text-slate-700">Notes:</strong> {ticket.repairNotes}</div>}
                    </Td>
                    <Td>
                      <div className="text-xs space-y-1">
                        <div>Labor: {formatCurrency(ticket.laborCost || 0)}</div>
                        <div>Parts: {formatCurrency(ticket.partsCost || 0)}</div>
                        {Number(ticket.vendorCost || 0) > 0 && <div>Vendor: {formatCurrency(ticket.vendorCost)}</div>}
                        <div className="border-t pt-1 font-semibold text-slate-800">Actual Cost: {formatCurrency(Number(ticket.laborCost || 0) + Number(ticket.partsCost || 0) + Number(ticket.vendorCost || 0))}</div>
                        {Number(ticket.finalInvoiceAmount || 0) > 0 && (
                          <div className="text-blue-700 font-semibold">Billed: {formatCurrency(ticket.finalInvoiceAmount)}</div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1.5 max-w-[160px]">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              ticketId: ticket.id,
                              status: "READY_FOR_DELIVERY",
                              reason: "Admin approved completion",
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                        >
                          Approve (Ready Delivery)
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              ticketId: ticket.id,
                              status: "IN_REPAIR",
                              reason: "Returned for rework",
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                        >
                          Return to Technician
                        </Button>
                        <div className="flex gap-1">
                          <Link className="flex-1" to={`/billing?ticketId=${ticket.id}`}>
                            <Button size="sm" variant="secondary" className="w-full">Invoice</Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                ticketId: ticket.id,
                                status: "SENT_TO_VENDOR",
                                reason: "Dispatched to vendor",
                              })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            Send Vendor
                          </Button>
                        </div>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>

      {/* Staff & Technician Performance */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] mb-6">
        {/* Technician Performance list */}
        <Card>
          <CardHeader>
            <CardTitle>Technician Workload</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <QueryState
              isLoading={ticketsQuery.isLoading || staffQuery.isLoading}
              error={ticketsQuery.error || staffQuery.error}
              isEmpty={technicianWorkload.length === 0}
              emptyTitle="No technician workload data"
              emptyDescription="Add branch technicians to see active workloads."
              onRetry={refreshDashboard}
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Technician</Th>
                    <Th>Active repairs</Th>
                    <Th>Pending Review</Th>
                    <Th>Completed</Th>
                  </tr>
                </thead>
                <tbody>
                  {technicianWorkload.map((tech) => (
                    <tr key={tech.technicianId}>
                      <Td className="font-semibold text-slate-900">{tech.fullName}</Td>
                      <Td className="text-center font-semibold text-indigo-600">{tech.activeRepairs}</Td>
                      <Td className="text-center font-semibold text-yellow-600">{tech.pendingReview}</Td>
                      <Td className="text-center font-semibold text-green-600">{tech.completedRepairs}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </QueryState>
          </CardContent>
        </Card>

        {/* Staff Management panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Branch Staff</CardTitle>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {technicians.length} in branch
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <QueryState
              isLoading={staffQuery.isLoading}
              error={staffQuery.error}
              isEmpty={technicians.length === 0}
              emptyTitle="No technicians found"
              emptyDescription="Add a technician using the creation form to start assigning repairs."
              onRetry={refreshStaff}
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((tech) => (
                    <tr key={tech.id}>
                      <Td>
                        <div className="font-semibold text-slate-900">{tech.fullName}</div>
                        <div className="text-xs text-slate-500">{tech.email}</div>
                      </Td>
                      <Td>
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${tech.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {tech.isActive ? "Active" : "Disabled"}
                        </span>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          variant={tech.isActive ? "danger" : "secondary"}
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              id: tech.id,
                              action: tech.isActive ? "disable" : "enable",
                            })
                          }
                        >
                          {tech.isActive ? "Disable" : "Enable"}
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </QueryState>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Add Technician Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Add Technician
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                createMutation.mutate({
                  name: String(form.get("fullName") || "").trim(),
                  fullName: String(form.get("fullName") || "").trim(),
                  email: String(form.get("email") || "").trim(),
                  phone: String(form.get("phone") || "").trim() || undefined,
                  password: String(form.get("password") || ""),
                  branchId: user?.branchId || "",
                });
                event.currentTarget.reset();
              }}
            >
              <Field label="Full Name"><Input name="fullName" required placeholder="e.g. John Doe" /></Field>
              <Field label="Email Address"><Input name="email" type="email" required placeholder="name@company.com" /></Field>
              <Field label="Phone (Optional)"><Input name="phone" placeholder="e.g. +1234567890" /></Field>
              <Field label="Initial Password"><Input name="password" type="password" minLength={8} required placeholder="At least 8 characters" /></Field>
              <Button className="w-full" disabled={createMutation.isPending}>Create Technician</Button>
            </form>
          </CardContent>
        </Card>

        {/* Reset password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-yellow-600" />
              Reset Technician Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                passwordMutation.mutate({
                  id: selectedStaffId,
                  password: String(form.get("password") || ""),
                });
                event.currentTarget.reset();
                setSelectedStaffId("");
              }}
            >
              <Field label="Technician">
                <Select
                  required
                  value={selectedStaffId}
                  onChange={(event) => setSelectedStaffId(event.target.value)}
                >
                  <option value="">Select a technician</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.fullName} ({tech.email})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="New Password"><Input name="password" type="password" minLength={8} required placeholder="At least 8 characters" /></Field>
              <Button className="w-full" disabled={!selectedStaffId || passwordMutation.isPending}>
                Reset Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
