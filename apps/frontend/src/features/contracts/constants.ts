import { contractStatuses, type ContractStatus } from "#/lib/enums";

export { contractStatuses, type ContractStatus };

export const contractStatusLabels = {
  draft: "Draft",
  sent_for_review: "Sent for Review",
  receipt_affirmed: "Receipt Affirmed",
  negotiation: "In Negotiation",
  negotiated: "Negotiated",
  sent_for_signature: "Sent for Signature",
  signed: "Signed",
  declined: "Declined",
} satisfies Record<ContractStatus, string>;

export const contractStatusDescriptions = {
  draft: "Contract is being prepared and has not been sent yet",
  sent_for_review: "Contract sent to the candidate for review",
  receipt_affirmed: "Candidate confirmed they received and reviewed the contract",
  negotiation: "Candidate and Dark Alpha are discussing terms",
  negotiated: "A mutually agreed version has been reached",
  sent_for_signature: "Final version sent to the candidate for signature",
  signed: "Contract signed by the candidate",
  declined: "Candidate declined the contract",
} satisfies Record<ContractStatus, string>;

export function isContractStatus(value: string): value is ContractStatus {
  // SAFETY: `contractStatuses` is a string-literal array; widening to
  // `readonly string[]` lets us search it with an arbitrary string value.
  return (contractStatuses as readonly string[]).includes(value);
}

export function getContractStatusLabel(status: string): string {
  if (isContractStatus(status)) {
    return contractStatusLabels[status];
  }
  return status.replace(/_/g, " ");
}

export const contractStatusBadgeVariants = {
  draft: "secondary",
  sent_for_review: "default",
  receipt_affirmed: "default",
  negotiation: "default",
  negotiated: "default",
  sent_for_signature: "default",
  signed: "default",
  declined: "destructive",
} satisfies Record<
  ContractStatus,
  "default" | "secondary" | "destructive" | "outline"
>;

export const contractStatusBorderColors = {
  draft: "border-l-zinc-400",
  sent_for_review: "border-l-blue-500",
  receipt_affirmed: "border-l-cyan-500",
  negotiation: "border-l-amber-500",
  negotiated: "border-l-amber-500",
  sent_for_signature: "border-l-purple-500",
  signed: "border-l-emerald-500",
  declined: "border-l-red-500",
} satisfies Record<ContractStatus, string>;

/** Application pipeline statuses we auto-derive when a contract moves. */
export const CONTRACT_OFFER_APP_STATUS = "contract_offer" as const;
export const AGREEMENT_APP_STATUS = "offer_agreement" as const;
