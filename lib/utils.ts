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

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** EU-14 Allergen-Liste */
export const EU_ALLERGENS = [
  { id: "gluten", label: "Gluten", icon: "Wheat" },
  { id: "crustaceans", label: "Krebstiere", icon: "Shell" },
  { id: "eggs", label: "Eier", icon: "Egg" },
  { id: "fish", label: "Fisch", icon: "Fish" },
  { id: "peanuts", label: "Erdnüsse", icon: "Nut" },
  { id: "soy", label: "Soja", icon: "Bean" },
  { id: "milk", label: "Milch/Laktose", icon: "Milk" },
  { id: "nuts", label: "Schalenfrüchte", icon: "TreeDeciduous" },
  { id: "celery", label: "Sellerie", icon: "Leaf" },
  { id: "mustard", label: "Senf", icon: "Droplet" },
  { id: "sesame", label: "Sesam", icon: "Circle" },
  { id: "sulphites", label: "Sulfite", icon: "Wine" },
  { id: "lupin", label: "Lupinen", icon: "Flower" },
  { id: "molluscs", label: "Weichtiere", icon: "Shell" },
] as const;

export type AllergenId = (typeof EU_ALLERGENS)[number]["id"];
