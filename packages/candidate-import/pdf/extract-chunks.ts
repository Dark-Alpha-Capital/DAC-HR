import { extractText } from "unpdf";
import type { ResumeChunk } from "../types";

export async function extractPerPageText(
  buffer: Uint8Array,
): Promise<string[]> {
  const result = await extractText(buffer, { mergePages: false });
  const text = result.text as string | string[] | undefined;

  if (Array.isArray(text)) {
    return text.map((page) => String(page ?? "").trim());
  }

  if (typeof text === "string" && text.trim()) {
    return text.split(/\f+/).map((page: string) => page.trim());
  }

  return [];
}

const RESUME_SECTION_HEADERS = new Set([
  "professional summary",
  "technical projects",
  "achievements",
  "education",
  "experience",
  "skills",
  "summary",
  "objective",
  "objective statement",
  "core competencies",
  "technical skills",
  "work experience",
  "certification",
  "certifications",
  "microsoft excel",
  "google sheets",
  "microsoft word",
  "phone",
  "email",
  "address",
]);

export function isBlockedResumeHeader(line: string): boolean {
  const normalized = line.trim().toLowerCase();
  if (RESUME_SECTION_HEADERS.has(normalized)) {
    return true;
  }

  // Skill-list lines: "Microsoft Excel", "Google Docs", etc.
  if (
    /^(microsoft|google|adobe|aws|azure)\s+/i.test(line) &&
    !/\s[A-Z][a-z]+/.test(line.slice(10))
  ) {
    return true;
  }

  return false;
}

export function looksLikeNameHeader(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 80) {
    return false;
  }

  if (isBlockedResumeHeader(trimmed)) {
    return false;
  }

  if (/[@\d]/.test(trimmed)) {
    return false;
  }

  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) {
    return false;
  }

  const uppercaseRatio =
    letters.replace(/[^A-Z]/g, "").length / letters.length;
  const titleCase =
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(trimmed) ||
    /^[A-Z][a-z]+(?:\s+\([A-Za-z]+\)\s+[A-Z][a-z]+)+$/.test(trimmed) ||
    /^[A-Z]{2,}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(trimmed);

  return uppercaseRatio > 0.6 || titleCase;
}

export function getFirstMeaningfulLine(pageText: string): string {
  const lines = pageText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[0] ?? "";
}

export function extractResumeChunksFromPages(
  pages: string[],
  rosterPageCount = 2,
): ResumeChunk[] {
  const chunks: ResumeChunk[] = [];
  let current: ResumeChunk | null = null;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageNumber = pageIndex + 1;
    if (pageNumber <= rosterPageCount) {
      continue;
    }

    const header = getFirstMeaningfulLine(pages[pageIndex] ?? "");
    const isNewResume = looksLikeNameHeader(header);

    if (isNewResume) {
      if (current) {
        current.endPage = pageNumber - 1;
        chunks.push(current);
      }
      current = {
        startPage: pageNumber,
        endPage: pageNumber,
        headerName: header,
      };
      continue;
    }

    if (current) {
      current.endPage = pageNumber;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function joinPagesText(pages: string[], startPage: number, endPage: number) {
  return pages
    .slice(startPage - 1, endPage)
    .join("\n\n")
    .trim();
}
