import { cn } from "@/utils/cn";

export function Button({ className, variant = "primary", size = "md", ...props }) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-md border font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
        variant === "primary" && "border-[var(--primary)] bg-[var(--primary)] text-white hover:brightness-95",
        variant === "secondary" && "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-[var(--foreground)] hover:bg-slate-100",
        variant === "danger" && "border-[var(--danger)] bg-[var(--danger)] text-white hover:brightness-95",
        className
      )}
      {...props}
    />
  );
}
