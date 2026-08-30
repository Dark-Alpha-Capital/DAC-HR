import { toOptionalString } from "#/lib/parse-search";

/** Top-level tabs on the interview bundle detail page. */
export const BUNDLE_DETAIL_TABS = [
  "rounds",
  "ai-analysis",
  "screenings",
  "emails",
] as const;

export type BundleDetailTab = (typeof BUNDLE_DETAIL_TABS)[number];

export type BundleDetailSearch = {
  tab?: BundleDetailTab;
};

/**
 * Parse the bundle detail search params. Invalid/unknown `tab` values coerce to
 * undefined, so the page falls back to "rounds".
 */
export function parseBundleDetailSearch(
  search: Record<string, string | string[] | undefined>,
): BundleDetailSearch {
  const rawTab = toOptionalString(search.tab);
  const tab = BUNDLE_DETAIL_TABS.find((candidate) => candidate === rawTab);
  return { tab };
}
