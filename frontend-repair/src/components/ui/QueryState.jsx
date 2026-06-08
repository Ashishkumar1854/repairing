import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function QueryState({ isLoading, error, isEmpty, emptyTitle = "No records found", emptyDescription, onRetry, children }) {
  if (isLoading) {
    return <div className="rounded-lg border border-[var(--border)] bg-white p-6 text-sm text-[var(--muted)]">Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-6">
        <p className="text-sm font-semibold text-[var(--danger)]">Unable to load data</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{error?.response?.data?.message || error.message || "Please retry."}</p>
        {onRetry ? <Button className="mt-4" size="sm" variant="secondary" onClick={onRetry}>Retry</Button> : null}
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return children;
}
