import { cn } from "@/utils/cn";

export function Input({ className, ...props }) {
  return <input className={cn("focus-ring h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm placeholder:text-slate-400", className)} {...props} />;
}

export function Select({ className, ...props }) {
  return <select className={cn("focus-ring h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn("focus-ring min-h-24 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm placeholder:text-slate-400", className)} {...props} />;
}

export function Field({ label, error, className, children }) {
  return (
    <label className={cn("block text-sm font-medium", className)}>
      {label}
      <div className="mt-1">{children}</div>
      {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}
