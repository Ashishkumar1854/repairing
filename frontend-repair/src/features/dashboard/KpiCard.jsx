import { Card, CardContent } from "@/components/ui/Card";

export function KpiCard({ label, value, detail, icon }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {detail ? <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p> : null}
        </div>
        {icon ? <div className="rounded-md bg-blue-50 p-2 text-[var(--primary)]">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
