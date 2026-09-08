/**
 * Pure contract-template helpers. No D1, no imports from outside this file
 * graph — unit-testable in isolation.
 */

export type ContractMergeValue = string | number | boolean | null | undefined;

/**
 * Core merge tokens every contract body may use. These are auto-filled by the
 * send flow from the candidate/position records (never user-supplied), so a
 * candidate's name is always inserted correctly.
 */
export const CONTRACT_CORE_TOKENS = {
  candidateName: "Candidate full name",
  candidateFirstName: "Candidate first name",
  candidateLastName: "Candidate last name",
  candidateEmail: "Candidate email",
  positionName: "Position title",
  hireLevel: "Hire level",
  department: "Department(s)",
  offerDate: "Date the offer is issued",
} as const;

/** Free-form offer variables a recruiter can supply per send ({compensation}, ...). */
export type ContractVariableTokens = Record<string, string>;

const TOKEN_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

/**
 * Merge `{{token}}` placeholders in a contract body with concrete values.
 *
 * Fails loudly (throws) when any token is unresolved so an unmerged contract
 * can never be sent to a candidate — a half-rendered "{{candidateName}}"
 * reaching a real offer would be a compliance issue, not just a typo.
 */
export function renderContractTemplate(
  bodyTemplate: string,
  values: Record<string, ContractMergeValue>,
): string {
  const missing = new Set<string>();

  const rendered = bodyTemplate.replace(TOKEN_PATTERN, (match, token: string) => {
    const value = values[token];
    if (value === undefined || value === null) {
      missing.add(token);
      return match;
    }
    return String(value);
  });

  if (missing.size > 0) {
    const sorted = [...missing].sort().join(", ");
    throw new Error(
      `Contract template is missing merge values for: ${sorted}. ` +
        "Add them as offer variables or fix the template before sending.",
    );
  }

  return rendered;
}

/** Format today as a human-readable offer date for {offerDate}. */
export function formatOfferDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
