import type {
  HandshakeRosterEntry,
  MatchedResume,
  ResumeChunk,
} from "../types";
import { nameAppearsInText, namesMatch } from "../dedup/name-matching";
import {
  getFirstMeaningfulLine,
  isBlockedResumeHeader,
  looksLikeNameHeader,
} from "./extract-chunks";

const MIN_OWNER_SCORE = 50;

function scorePageForRosterEntry(
  pageText: string,
  entry: HandshakeRosterEntry,
): number {
  const top = pageText.slice(0, 900);
  const lowerTop = top.toLowerCase();
  const email = entry.email.toLowerCase();
  let score = 0;

  const emailIndex = lowerTop.indexOf(email);
  if (emailIndex !== -1) {
    score += 100;
    score += Math.max(0, 20 - Math.floor(emailIndex / 40));
  }

  if (nameAppearsInText(entry.name, top)) {
    score += 80;
    const nameIndex = lowerTop.indexOf(
      entry.name.split(/\s+/)[0]?.toLowerCase() ?? "",
    );
    if (nameIndex !== -1 && nameIndex < 400) {
      score += 10;
    }
  }

  const firstLine = getFirstMeaningfulLine(pageText);
  if (firstLine && namesMatch(firstLine, entry.name)) {
    score += 90;
  }

  return score;
}

function detectHeaderName(pageText: string, rosterName: string): string {
  const firstLine = getFirstMeaningfulLine(pageText);
  if (firstLine && looksLikeNameHeader(firstLine)) {
    return firstLine;
  }
  if (nameAppearsInText(rosterName, pageText.slice(0, 400))) {
    return rosterName;
  }
  return rosterName;
}

function assignPageOwners(
  pages: string[],
  roster: HandshakeRosterEntry[],
  rosterPageCount: number,
): Array<number | null> {
  const owners: Array<number | null> = new Array(pages.length).fill(null);

  for (let pageIndex = rosterPageCount; pageIndex < pages.length; pageIndex++) {
    const pageText = pages[pageIndex] ?? "";
    let bestRosterIndex = -1;
    let bestScore = 0;

    for (let r = 0; r < roster.length; r++) {
      const score = scorePageForRosterEntry(pageText, roster[r]!);
      if (score > bestScore) {
        bestScore = score;
        bestRosterIndex = r;
      }
    }

    if (bestScore >= MIN_OWNER_SCORE) {
      owners[pageIndex] = bestRosterIndex;
    }
  }

  // Continuation pages inherit the previous owner when no new owner is detected.
  for (
    let pageIndex = rosterPageCount + 1;
    pageIndex < pages.length;
    pageIndex++
  ) {
    if (owners[pageIndex] !== null) {
      continue;
    }

    const prevOwner = owners[pageIndex - 1];
    if (prevOwner === null) {
      continue;
    }

    const pageText = pages[pageIndex] ?? "";
    const prevEntry = roster[prevOwner]!;

    let competingScore = 0;
    for (let r = 0; r < roster.length; r++) {
      if (r === prevOwner) {
        continue;
      }
      competingScore = Math.max(
        competingScore,
        scorePageForRosterEntry(pageText, roster[r]!),
      );
    }

    const firstLine = getFirstMeaningfulLine(pageText);
    const startsDetachedSection =
      isBlockedResumeHeader(firstLine) &&
      !nameAppearsInText(prevEntry.name, pageText.slice(0, 250));

    if (competingScore < MIN_OWNER_SCORE && !startsDetachedSection) {
      owners[pageIndex] = prevOwner;
    }
  }

  return owners;
}

function ownersToChunks(
  pages: string[],
  roster: HandshakeRosterEntry[],
  owners: Array<number | null>,
  rosterPageCount: number,
): ResumeChunk[] {
  const chunks: ResumeChunk[] = [];
  let pageIndex = rosterPageCount;

  while (pageIndex < pages.length) {
    const owner = owners[pageIndex];
    if (owner === null) {
      pageIndex++;
      continue;
    }

    const startIndex = pageIndex;
    while (pageIndex < pages.length && owners[pageIndex] === owner) {
      pageIndex++;
    }

    chunks.push({
      kind: "roster",
      startPage: startIndex + 1,
      endPage: pageIndex,
      headerName: detectHeaderName(
        pages[startIndex] ?? "",
        roster[owner]!.name,
      ),
      rosterEmail: roster[owner]!.email,
    });
  }

  return chunks;
}

function findOrphanRanges(
  owners: Array<number | null>,
  rosterPageCount: number,
): Array<{ startPage: number; endPage: number }> {
  const ranges: Array<{ startPage: number; endPage: number }> = [];
  let rangeStart: number | null = null;

  for (
    let pageIndex = rosterPageCount;
    pageIndex < owners.length;
    pageIndex++
  ) {
    if (owners[pageIndex] === null) {
      if (rangeStart === null) {
        rangeStart = pageIndex;
      }
      continue;
    }

    if (rangeStart !== null) {
      ranges.push({ startPage: rangeStart + 1, endPage: pageIndex });
      rangeStart = null;
    }
  }

  if (rangeStart !== null) {
    ranges.push({ startPage: rangeStart + 1, endPage: owners.length });
  }

  return ranges;
}

function assignOrphanPagesByRosterOrder(
  pages: string[],
  roster: HandshakeRosterEntry[],
  owners: Array<number | null>,
  rosterPageCount: number,
): void {
  const assignedRoster = new Set(
    owners.filter((owner): owner is number => owner !== null),
  );
  const unmatchedRosterIndexes = roster
    .map((_, index) => index)
    .filter((index) => !assignedRoster.has(index));

  const orphanRanges = findOrphanRanges(owners, rosterPageCount);

  for (
    let i = 0;
    i < orphanRanges.length && i < unmatchedRosterIndexes.length;
    i++
  ) {
    const range = orphanRanges[i]!;
    const rosterIndex = unmatchedRosterIndexes[i]!;

    for (
      let pageIndex = range.startPage - 1;
      pageIndex < range.endPage;
      pageIndex++
    ) {
      owners[pageIndex] = rosterIndex;
    }
  }
}

export function extractHandshakeResumeChunks(
  pages: string[],
  roster: HandshakeRosterEntry[],
  rosterPageCount = 2,
): ResumeChunk[] {
  if (roster.length === 0 || pages.length <= rosterPageCount) {
    return [];
  }

  const owners = assignPageOwners(pages, roster, rosterPageCount);
  assignOrphanPagesByRosterOrder(pages, roster, owners, rosterPageCount);
  return ownersToChunks(pages, roster, owners, rosterPageCount);
}

export function matchHandshakeExport(
  chunks: ResumeChunk[],
  roster: HandshakeRosterEntry[],
): {
  matched: MatchedResume[];
  unmatchedRoster: HandshakeRosterEntry[];
  unmatchedChunks: ResumeChunk[];
} {
  const matched: MatchedResume[] = [];
  const usedRosterEmails = new Set<string>();
  const usedChunkKeys = new Set<string>();

  for (const chunk of chunks) {
    if (chunk.kind !== "roster") {
      continue;
    }

    const entry = roster.find((r) => r.email === chunk.rosterEmail);
    if (!entry || usedRosterEmails.has(entry.email)) {
      continue;
    }

    const chunkKey = `${chunk.startPage}-${chunk.endPage}`;
    matched.push({ roster: entry, chunk });
    usedRosterEmails.add(entry.email);
    usedChunkKeys.add(chunkKey);
  }

  const unmatchedRoster = roster.filter(
    (entry) => !usedRosterEmails.has(entry.email),
  );
  const unmatchedChunks = chunks.filter(
    (chunk) => !usedChunkKeys.has(`${chunk.startPage}-${chunk.endPage}`),
  );

  return { matched, unmatchedRoster, unmatchedChunks };
}
