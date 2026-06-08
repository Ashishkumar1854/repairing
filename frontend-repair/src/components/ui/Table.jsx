import { cn } from "@/utils/cn";

export function Table({ className, ...props }) {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className={cn("w-full min-w-[760px] border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }) {
  return <th className={cn("border-b border-[var(--border)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500", className)} {...props} />;
}

export function Td({ className, ...props }) {
  return <td className={cn("border-b border-slate-100 px-4 py-3 align-middle", className)} {...props} />;
}
