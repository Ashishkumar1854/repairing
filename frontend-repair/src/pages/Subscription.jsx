import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { subscriptionApi } from "@/services/modules";

function formatDate(value) {
  if (!value) return "No expiry set";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Subscription() {
  const subscriptionQuery = useQuery({
    queryKey: ["subscription-current"],
    queryFn: subscriptionApi.current,
  });
  const subscription = subscriptionQuery.data?.data?.subscription;

  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Read-only SaaS plan status for this repair business."
      />
      <QueryState
        isLoading={subscriptionQuery.isLoading}
        error={subscriptionQuery.error}
        isEmpty={!subscription}
        emptyTitle="Subscription unavailable"
        onRetry={subscriptionQuery.refetch}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted)]">Plan</p>
                <p className="mt-2 text-2xl font-bold">{subscription.plan}</p>
              </div>
              <div className="rounded-md border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted)]">Status</p>
                <p className="mt-2 text-2xl font-bold">{subscription.status}</p>
              </div>
              <div className="rounded-md border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted)]">Expiry</p>
                <p className="mt-2 text-2xl font-bold">{formatDate(subscription.expiresAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </QueryState>
    </div>
  );
}
