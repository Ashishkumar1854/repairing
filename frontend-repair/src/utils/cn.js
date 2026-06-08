import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function unwrapArray(envelope, keys) {
  const data = envelope?.data ?? {};
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

export function unwrapObject(envelope, keys) {
  const data = envelope?.data ?? {};
  for (const key of keys) {
    if (data[key] && typeof data[key] === "object") return data[key];
  }
  return data;
}
