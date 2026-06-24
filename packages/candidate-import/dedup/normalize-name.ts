export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "Unknown", lastName: "Candidate" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "" };
  }

  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}
