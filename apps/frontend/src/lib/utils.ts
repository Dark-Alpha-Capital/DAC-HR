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
