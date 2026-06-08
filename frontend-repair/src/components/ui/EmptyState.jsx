export function EmptyState({ title, description }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}
