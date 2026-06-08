import { cn } from "@/utils/cn";

export function Card({ className, ...props }) {
  return <div className={cn("min-w-0 rounded-lg border border-[var(--border)] bg-white shadow-sm", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("border-b border-[var(--border)] p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h2 className={cn("text-base font-semibold text-[var(--foreground)]", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}
