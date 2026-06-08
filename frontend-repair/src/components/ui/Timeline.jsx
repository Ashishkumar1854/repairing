import { formatDate } from "@/utils/cn";
import { displayValue } from "@/utils/data";

export function Timeline({ items, titleKey = "type", dateKey = "createdAt", description }) {
  if (!items?.length) {
    return <p className="text-sm text-[var(--muted)]">No history recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id || index} className="grid grid-cols-[18px_1fr] gap-3">
          <div className="mt-1 h-3 w-3 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(15,159,143,0.12)]" />
          <div className="rounded-md border border-[var(--border)] bg-white p-3">
            <p className="text-sm font-semibold">{displayValue(item[titleKey] || item.status || item.action || "Event").replaceAll("_", " ")}</p>
            {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description(item)}</p> : null}
            <p className="mt-2 text-xs text-[var(--muted)]">{formatDate(item[dateKey] || item.updatedAt || item.handedOverAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
