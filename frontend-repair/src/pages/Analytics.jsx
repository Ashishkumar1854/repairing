import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { analyticsApi } from "@/services/modules";
import { chartRowsFromEnvelope } from "@/utils/data";

const endpoints = [
  ["Repair Summary", analyticsApi.repairSummary],
  ["Repair Status Breakdown", analyticsApi.statusBreakdown],
  ["Revenue", analyticsApi.revenue],
  ["Dues", analyticsApi.dues],
  ["Payments", analyticsApi.payments],
  ["Profitability", analyticsApi.profitability],
  ["Technician Performance", analyticsApi.technicianPerformance],
  ["Technician Workload", analyticsApi.technicianWorkload],
  ["Inventory Usage", analyticsApi.inventoryUsage],
  ["Inventory Variance", analyticsApi.inventoryVariance],
  ["SLA", analyticsApi.sla],
  ["Customer Analytics", analyticsApi.customers],
];

export function Analytics() {
  const results = endpoints.map(([label, fn]) => useQuery({ queryKey: ["analytics", label], queryFn: () => fn() }));
  const revenueRows = chartRowsFromEnvelope(results[2].data, ["series", "revenue", "rows", "daily", "monthly"]);
  const profitabilityRows = chartRowsFromEnvelope(results[5].data, ["profitability", "repairs", "rows"]);
  return (
    <>
      <PageHeader title="Analytics" description="Owner dashboard, repair summary, revenue, profitability, technician performance, inventory usage, and customer analytics." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Revenue</CardTitle></CardHeader><CardContent className="h-72">{revenueRows.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={revenueRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line dataKey="value" stroke="#1769aa" strokeWidth={2} /></LineChart></ResponsiveContainer> : <EmptyState title="No revenue data" description="Revenue chart will render when the backend returns finance rows." />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Profitability</CardTitle></CardHeader><CardContent className="h-72">{profitabilityRows.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={profitabilityRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#0f9f8f" /></BarChart></ResponsiveContainer> : <EmptyState title="No profitability data" description="Profitability chart uses backend profitability rows only." />}</CardContent></Card>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{endpoints.map(([label], index) => <AnalyticsTable key={label} label={label} data={results[index].data} />)}</div>
    </>
  );
}

function AnalyticsTable({ label, data }) {
  const rows = chartRowsFromEnvelope(data);
  return <Card><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent className="p-0">{rows.length ? <Table><thead><tr><Th>Metric</Th><Th>Value</Th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${label}-${index}`}><Td>{row.name}</Td><Td>{row.rawValue ?? row.value}</Td></tr>)}</tbody></Table> : <div className="p-5"><EmptyState title="No data returned" description={`${label} has no rows in the current backend response.`} /></div>}</CardContent></Card>;
}
