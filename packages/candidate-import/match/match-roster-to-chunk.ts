import Fuse from "fuse.js";
import type { HandshakeRosterEntry, MatchedResume, ResumeChunk } from "../types";
import { normalizeName } from "../dedup/normalize-name";
import { namesMatch } from "../dedup/name-matching";

export function matchRosterToChunks(
  roster: HandshakeRosterEntry[],
  chunks: ResumeChunk[],
): {
  matched: MatchedResume[];
  unmatchedRoster: HandshakeRosterEntry[];
  unmatchedChunks: ResumeChunk[];
} {
  const matched: MatchedResume[] = [];
  const usedChunkIndexes = new Set<number>();
  const usedRosterIndexes = new Set<number>();

  for (let r = 0; r < roster.length; r++) {
    const entry = roster[r]!;
    const normalizedRosterName = normalizeName(entry.name);

    for (let c = 0; c < chunks.length; c++) {
      if (usedChunkIndexes.has(c)) {
        continue;
      }

      const chunk = chunks[c]!;

      if (chunk.rosterEmail === entry.email) {
        matched.push({ roster: entry, chunk });
        usedChunkIndexes.add(c);
        usedRosterIndexes.add(r);
        break;
      }

      if (
        normalizeName(chunk.headerName) === normalizedRosterName ||
        namesMatch(chunk.headerName, entry.name)
      ) {
        matched.push({ roster: entry, chunk });
        usedChunkIndexes.add(c);
        usedRosterIndexes.add(r);
        break;
      }
    }
  }

  const remainingRoster = roster
    .map((entry, index) => ({ entry, index }))
    .filter(({ index }) => !usedRosterIndexes.has(index));

  const remainingChunks = chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(({ index }) => !usedChunkIndexes.has(index));

  if (remainingRoster.length > 0 && remainingChunks.length > 0) {
    const fuse = new Fuse(remainingChunks, {
      keys: ["chunk.headerName"],
      threshold: 0.35,
      includeScore: true,
    });

    for (const { entry, index: rosterIndex } of remainingRoster) {
      const results = fuse.search(entry.name);
      const best = results[0];
      if (!best || (best.score ?? 1) > 0.35) {
        continue;
      }

      const chunkIndex = best.item.index;
      if (usedChunkIndexes.has(chunkIndex)) {
        continue;
      }

      matched.push({ roster: entry, chunk: best.item.chunk });
      usedChunkIndexes.add(chunkIndex);
      usedRosterIndexes.add(rosterIndex);
    }
  }

  const unmatchedRoster = roster.filter(
    (_, index) => !usedRosterIndexes.has(index),
  );
  const unmatchedChunks = chunks.filter(
    (_, index) => !usedChunkIndexes.has(index),
  );

  return { matched, unmatchedRoster, unmatchedChunks };
}
