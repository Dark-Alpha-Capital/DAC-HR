import type { CsvRow } from "../types";
import { splitFullName } from "../dedup/normalize-name";

const HEADER_ALIASES = {
  firstName: [
    "first name",
    "firstname",
    "first_name",
    "fname",
    "student first name",
  ],
  lastName: [
    "last name",
    "lastname",
    "last_name",
    "lname",
    "surname",
    "student last name",
  ],
  fullName: ["name", "full name", "fullname", "candidate name"],
  email: ["email", "email address", "e-mail", "student email"],
  phone: ["phone", "phone number", "mobile", "telephone"],
  location: ["location", "city", "address"],
  school: [
    "school",
    "university",
    "college",
    "institution",
    "student school",
  ],
  major: ["major", "majors", "field of study", "degree", "program"],
  graduationYear: [
    "graduation year",
    "grad year",
    "graduation_year",
    "class year",
    "year",
    "student graduation date",
  ],
} satisfies Record<string, string[]>;

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function mapHeader(header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized) || normalized === field.toLowerCase()) {
      return field;
    }
  }
  return null;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseGraduationYear(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

export function parseCsvContent(content: string): CsvRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]!);
  const fieldIndexes = new Map<string, number>();
  headers.forEach((header, index) => {
    const field = mapHeader(header);
    if (field) {
      fieldIndexes.set(field, index);
    }
  });

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]!);
    const get = (field: string) => {
      const index = fieldIndexes.get(field);
      return index === undefined ? "" : (values[index] ?? "").trim();
    };

    let firstName = get("firstName");
    let lastName = get("lastName");
    const fullName = get("fullName");

    if ((!firstName || !lastName) && fullName) {
      const split = splitFullName(fullName);
      firstName = firstName || split.firstName;
      lastName = lastName || split.lastName;
    }

    const email = get("email").toLowerCase();
    if (!email) {
      continue;
    }

    rows.push({
      rowIndex: i,
      firstName: firstName || "Unknown",
      lastName: lastName || "",
      email,
      phone: get("phone") || null,
      location: get("location") || null,
      school: get("school") || null,
      major: get("major") || null,
      graduationYear: parseGraduationYear(get("graduationYear")),
    });
  }

  return rows;
}

/** All import types the pipeline can process (including Handshake PDF). */
export function detectImportTypeFromFilename(
  filename: string,
): "csv" | "zip" | "pdf" | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "csv") return "csv";
  if (ext === "zip") return "zip";
  if (ext === "pdf") return "pdf";
  return null;
}

/** Bulk-upload UI/API entry — PDF Handshake flow is unlinked but still in processors. */
export function detectBulkUploadTypeFromFilename(
  filename: string,
): "csv" | "zip" | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "csv") return "csv";
  if (ext === "zip") return "zip";
  return null;
}
