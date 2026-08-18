export const candidateSortOptions = [
  "newest",
  "oldest",
  "name_asc",
  "name_desc",
  "updated",
] as const;

export type CandidateSortOption = (typeof candidateSortOptions)[number];

export const candidateSortLabels = {
  newest: "Newest first",
  oldest: "Oldest first",
  name_asc: "Name (A–Z)",
  name_desc: "Name (Z–A)",
  updated: "Recently updated",
} satisfies Record<CandidateSortOption, string>;

export const candidateSourceOptions = [
  "LinkedIn",
  "Upwork",
  "Handshake",
  "Indeed",
  "Referral",
  "Company Website",
  "Agency",
] as const;

export type CandidateSourceOption = (typeof candidateSourceOptions)[number];

export function isCandidateSortOption(
  value: string,
): value is CandidateSortOption {
  // SAFETY: `candidateSortOptions` is a string-literal array; widening to
  // `readonly string[]` lets us search it with an arbitrary string value.
  return (candidateSortOptions as readonly string[]).includes(value);
}

export function parseCandidateSortOption(
  value: string | undefined,
): CandidateSortOption {
  if (value && isCandidateSortOption(value)) {
    return value;
  }
  return "newest";
}
