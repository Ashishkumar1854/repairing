import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, CreditCard, PackageCheck, Wrench } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/features/dashboard/KpiCard";
import { analyticsApi } from "@/services/modules";
import { formatCurrency } from "@/utils/cn";
import { chartRowsFromEnvelope } from "@/utils/data";
import { Table, Td, Th } from "@/components/ui/Table";

const colors = ["#1769aa", "#0f9f8f", "#b7791f", "#16794c"];

const shopWorkflowSteps = [
  "Repairs: create a repair ticket when the customer brings the device and explains the issue.",
  "Assignments: assign the ticket to a technician so diagnosis and repair ownership are clear.",
  "Estimates: record diagnosis, pricing, expected turnaround, then approve or reject after customer confirmation.",
  "Vendors: if outside repair is needed, dispatch to vendor, update vendor status/cost, then receive it back.",
  "Parts Usage and Inventory: consume actual parts during repair so stock and repair cost stay accurate.",
  "Billing: generate invoice, collect full or partial payment, and clear remaining dues.",
  "Handover: record custody movement back to the customer and mark the repair delivered or closed.",
  "Analytics: review revenue, pending dues, technician workload, repair KPIs, and inventory consumption.",
];

function metric(data, keys) {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], data);
    if (value !== undefined) return value;
  }
  return 0;
}

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics", "owner-dashboard"], queryFn: () => analyticsApi.ownerDashboard() });
  const statusQuery = useQuery({ queryKey: ["analytics", "status-breakdown"], queryFn: () => analyticsApi.statusBreakdown() });
  const workloadQuery = useQuery({ queryKey: ["analytics", "technician-workload"], queryFn: () => analyticsApi.technicianWorkload() });
  const dashboard = data?.data || {};
  const statusRows = chartRowsFromEnvelope(statusQuery.data, ["breakdown", "statuses", "rows"]);
  const workloadRows = chartRowsFromEnvelope(workloadQuery.data, ["workload", "technicians", "rows"]);

  return (
    <>
      <PageHeader title="Dashboard" description="Owner dashboard integrated with GET /analytics/dashboard/owner." />
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Shop Workflow Note</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shopWorkflowSteps.map((step, index) => (
              <div key={step} className="flex min-w-0 gap-3 rounded-md border border-[var(--border)] bg-slate-50 p-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-[var(--primary)] shadow-sm">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)]">{step}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            This panel is for shop staff. Customers give the device and issue details to the shop; staff operates the full repair workflow from this ERP.
          </p>
        </CardContent>
      </Card>
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
