export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const departmentLabels: Record<string, string> = {
  "management": "Management",
  "capital-markets": "Capital Markets",
  "deal-team": "Deal Team",
  "legal": "Legal",
  "operations": "Operations",
  "origination": "Origination",
  "pipe": "PIPE",
  "public-markets": "Public Markets",
};

export const formatDepartment = (department: string | string[]): string => {
  if (Array.isArray(department)) {
    return department.map((dept) => departmentLabels[dept] || dept).join(", ");
  }
  return departmentLabels[department] || department;
};

export const formatDepartments = (departments: string | string[]): string[] => {
  if (Array.isArray(departments)) {
    return departments.map((dept) => departmentLabels[dept] || dept);
  }
  return [departmentLabels[departments] || departments];
};
