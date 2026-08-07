import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const departmentLabels: Record<string, string> = {
  management: "Management",
  "capital-markets": "Capital Markets",
  "deal-team": "Deal Team",
  legal: "Legal",
  operations: "Operations",
  origination: "Origination",
  pipe: "PIPE",
  "public-markets": "Public Markets",
};

export function formatDepartment(department: string | string[]): string {
  if (Array.isArray(department)) {
    return department.map((dept) => departmentLabels[dept] || dept).join(", ");
  }
  return departmentLabels[department] || department;
}

export function formatDepartments(departments: string | string[]): string[] {
  if (Array.isArray(departments)) {
    return departments.map((dept) => departmentLabels[dept] || dept);
  }
  return [departmentLabels[departments] || departments];
}

export function formatDateTime(date: Date | string | number | null) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function formatMMDD(date: Date | string | number | null) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

const NEW_ITEM_DAYS = 7;

export function isNew(
  date: Date | string | number | null,
  windowDays = NEW_ITEM_DAYS,
) {
  if (!date) return false;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return parsed.getTime() >= cutoff;
}
