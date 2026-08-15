/**
 * Splits a free-form location string into city/state parts.
 * Handles "City, ST", "City, State", and falls back to putting the whole
 * string in the city field when no state abbreviation is detected.
 */
const STATE_ABBR_SET = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  "PR",
  "VI",
  "GU",
  "AS",
  "MP",
]);

export function splitLocation(location: string | null | undefined) {
  if (!location || !location.trim()) {
    return { city: null, state: null };
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const statePart = parts[parts.length - 1]!;
    const state = statePart.length === 2 ? statePart.toUpperCase() : null;
    if (state && STATE_ABBR_SET.has(state)) {
      return {
        city: parts.slice(0, parts.length - 1).join(", ") || null,
        state,
      };
    }
  }

  return { city: location.trim() || null, state: null };
}
