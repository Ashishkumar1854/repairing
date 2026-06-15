import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { repairApi } from "@/services/modules";
import { formatDate, unwrapArray } from "@/utils/cn";

const chain = ["RECEPTION", "TECHNICIAN", "VENDOR", "RECEPTION", "CUSTOMER"];

export function CustodyTimeline({ ticketId }) {
  const { data } = useQuery({
    queryKey: ["handover", ticketId],
    queryFn: () => repairApi.handovers(ticketId),
    enabled: Boolean(ticketId),
  });
  const handovers = unwrapArray(data, ["handovers", "ticketHandovers"]);
  const sortedHandovers = [...handovers].sort((a, b) => {
    const left = new Date(a.handedOverAt || a.createdAt || 0).getTime();
    const right = new Date(b.handedOverAt || b.createdAt || 0).getTime();
    return right - left;
  });
  const latest = sortedHandovers[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custody Timeline</CardTitle>
        {latest ? <p className="mt-1 text-sm text-[var(--muted)]">Latest Transition: {latest.type?.replaceAll("_", " ")}</p> : null}
      </CardHeader>
      <CardContent>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {chain.map((holder, index) => (
            <div key={`${holder}-${index}`} className="flex items-center gap-2">
              <StatusBadge status={holder} />
              {index < chain.length - 1 ? <ArrowRight className="h-4 w-4 text-slate-400" /> : null}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {handovers.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No handover history yet.</p>
          ) : (
            sortedHandovers.map((handover) => (
              <div key={handover.id} className="grid gap-3 rounded-md border border-[var(--border)] p-3 md:grid-cols-[32px_1fr_auto]">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="font-medium">{handover.type?.replaceAll("_", " ")}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {handover.fromHolderType || "SYSTEM"} to {handover.toHolderType || handover.currentHolderType}
                    {handover.currentLocation ? ` · ${handover.currentLocation}` : ""}
                  </p>
                  {handover.notes ? <p className="mt-1 text-sm">{handover.notes}</p> : null}
                </div>
                <p className="text-xs text-[var(--muted)]">{formatDate(handover.handedOverAt || handover.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
