import { cn } from "@/utils/cn";

const tones = {
  RECEIVED: "bg-slate-100 text-slate-700",
  DIAGNOSING: "bg-cyan-50 text-cyan-800",
  ESTIMATE_PENDING: "bg-amber-50 text-amber-800",
  WAITING_APPROVAL: "bg-yellow-50 text-yellow-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  IN_REPAIR: "bg-blue-50 text-blue-800",
  WAITING_PARTS: "bg-orange-50 text-orange-800",
  SENT_TO_VENDOR: "bg-purple-50 text-purple-800",
  READY_FOR_DELIVERY: "bg-teal-50 text-teal-800",
  DELIVERED: "bg-green-50 text-green-800",
  CANCELLED: "bg-red-50 text-red-800",
  CLOSED: "bg-slate-200 text-slate-800",
  PENDING: "bg-yellow-50 text-yellow-800",
  DONE: "bg-emerald-50 text-emerald-800",
  ACTIVE: "bg-emerald-50 text-emerald-800",
  TRIALING: "bg-cyan-50 text-cyan-800",
  EXPIRED: "bg-red-50 text-red-800",
  SUSPENDED: "bg-slate-200 text-slate-800",
  PARTIAL: "bg-amber-50 text-amber-800",
  PAID: "bg-green-50 text-green-800",
  RECEPTION: "bg-cyan-50 text-cyan-800",
  TECHNICIAN: "bg-blue-50 text-blue-800",
  VENDOR: "bg-purple-50 text-purple-800",
  CUSTOMER: "bg-green-50 text-green-800",
  STORAGE: "bg-slate-100 text-slate-700",
};

export function StatusBadge({ status, className }) {
  const value = status || "UNKNOWN";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[value] || "bg-slate-100 text-slate-700", className)}>
      {String(value).replaceAll("_", " ")}
    </span>
  );
}
