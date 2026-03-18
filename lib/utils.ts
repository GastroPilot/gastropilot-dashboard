import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateOnly(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function confirmAction(message: string): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem("confirmations_enabled");
  const normalized = (raw || "true").trim().toLowerCase();
  const enabled = normalized !== "false" && normalized !== "0" && normalized !== "off";
  if (!enabled) return true;
  return window.confirm(message);
}
