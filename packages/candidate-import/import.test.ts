import { test, expect } from "bun:test";
import { normalizeName, splitFullName } from "./dedup/normalize-name";
import {
  nameAppearsInText,
  nameMatchKeys,
  namesMatch,
} from "./dedup/name-matching";
import { parseCsvContent } from "./processors/csv";
import {
  extractResumeChunksFromPages,
} from "./pdf/extract-chunks";
import { matchRosterToChunks } from "./match/match-roster-to-chunk";
import { parseHandshakeRosterFromText } from "./parsers/extract-handshake-roster";
import { matchHandshakeExport } from "./pdf/handshake-chunks";

test("normalizeName matches variants", () => {
  expect(normalizeName("Alexander Barto")).toBe(normalizeName("ALEXANDER BARTO"));
});

test("nameMatchKeys handles parenthetical and middle initials", () => {
  expect(nameMatchKeys("Ashley (Xiwen) Bi")).toContain("xiwenbi");
  expect(namesMatch("Xiwen Bi", "Ashley (Xiwen) Bi")).toBe(true);
  expect(namesMatch("Benedicta Obeng", "BENEDICTA B. OBENG")).toBe(true);
});

test("nameAppearsInText handles spaced name fragments", () => {
  expect(nameAppearsInText("Harry Felgran", "Harry Fe lgran\nNew York")).toBe(
    true,
  );
  expect(
    nameAppearsInText(
      "Isabel Garney",
      "MARKETING STUDENTIsabel GarneyPROFESSIONAL SUMMARY",
    ),
  ).toBe(true);
});

test("splitFullName handles single and multi part names", () => {
  expect(splitFullName("John Doe")).toEqual({
    firstName: "John",
    lastName: "Doe",
  });
  expect(splitFullName("Madonna")).toEqual({
    firstName: "Madonna",
    lastName: "",
  });
});

test("parseCsvContent maps flexible headers", () => {
  const csv = `Name,Email,Major,School
Jane Doe,jane@example.com,Computer Science,Columbia`;

  const rows = parseCsvContent(csv);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.firstName).toBe("Jane");
  expect(rows[0]?.lastName).toBe("Doe");
  expect(rows[0]?.email).toBe("jane@example.com");
  expect(rows[0]?.major).toBe("Computer Science");
  expect(rows[0]?.school).toBe("Columbia");
});

test("parseCsvContent maps Handshake application export headers", () => {
  const csv = `Application ID,Student First Name,Student Last Name,Student Email,Student School,Student Graduation Date,Majors
270152215,Isabel,Garney,imgarney@olivet.edu,Olivet Nazarene University,2026-05-09,Marketing`;

  const rows = parseCsvContent(csv);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    firstName: "Isabel",
    lastName: "Garney",
    email: "imgarney@olivet.edu",
    school: "Olivet Nazarene University",
    major: "Marketing",
    graduationYear: 2026,
  });
});

test("extractResumeChunksFromPages detects name headers", () => {
  const pages = [
    "Applicant Roster",
    "More roster",
    "ALEXANDER BARTO\nExperience...",
    "continued resume",
    "HARRY FELGRAN\nEducation...",
  ];

  const chunks = extractResumeChunksFromPages(pages, 2);
  expect(chunks).toHaveLength(2);
  expect(chunks[0]).toMatchObject({
    startPage: 3,
    endPage: 4,
    headerName: "ALEXANDER BARTO",
  });
  expect(chunks[1]).toMatchObject({
    startPage: 5,
    endPage: 5,
    headerName: "HARRY FELGRAN",
  });
});

test("matchRosterToChunks exact and fuzzy matching", () => {
  const roster = [
    { name: "Alexander Barto", email: "alex@example.com" },
    { name: "Harry Felgran", email: "harry@example.com" },
  ];
  const chunks = [
    { startPage: 3, endPage: 4, headerName: "ALEXANDER BARTO" },
    { startPage: 5, endPage: 5, headerName: "Harry Felgran" },
  ];

  const { matched, unmatchedRoster, unmatchedChunks } = matchRosterToChunks(
    roster,
    chunks,
  );

  expect(matched).toHaveLength(2);
  expect(unmatchedRoster).toHaveLength(0);
  expect(unmatchedChunks).toHaveLength(0);
});

test("parseHandshakeRosterFromText extracts roster lines", () => {
  const text = `Applicant Roster
Alexander Barto, alex@example.com, Columbia University
Harry Felgran, harry@example.com, NYU`;

  const roster = parseHandshakeRosterFromText(text);
  expect(roster.length).toBeGreaterThanOrEqual(2);
  expect(roster[0]?.email).toContain("@");
});

test("matchHandshakeExport assigns one chunk per roster entry on multi-resume pages", () => {
  const roster = [
    { name: "Ashley (Xiwen) Bi", email: "xb2186@columbia.edu" },
    { name: "Harry Felgran", email: "hfelgran@gmail.com" },
    { name: "Isabel Garney", email: "imgarney@olivet.edu" },
    { name: "Michael Gonzalez", email: "michagonza91@gmail.com" },
    { name: "Don Gunderson", email: "donjgunderson@hotmail.com" },
  ];

  const pages = [
    "Roster page 1",
    "Roster page 2",
    "Ashley (Xiwen) Bi\nStatistics resume",
    "Harry Fe lgran\nhfelgran@gmail.com\nSummary",
    "Phone:\nIsabel GarneyPROFESSIONAL SUMMARY",
    "PROFESSIONAL SUMMARY\nAdmin resume body",
    "Microsoft Excel\nMore skills",
    "Don J. Gunderson\ndonjgunderson@hotmail.com\nOverview",
  ];

  const { matched, unmatchedRoster } = matchHandshakeExport(pages, roster, 2);

  expect(matched).toHaveLength(5);
  expect(unmatchedRoster).toHaveLength(0);
  expect(matched.map((m) => m.roster.email)).toEqual([
    "xb2186@columbia.edu",
    "hfelgran@gmail.com",
    "imgarney@olivet.edu",
    "michagonza91@gmail.com",
    "donjgunderson@hotmail.com",
  ]);
});
