import { applicationStatuses, type ApplicationStatus } from "./enums";

export { applicationStatuses, type ApplicationStatus };

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  ai_screening: "First Round (AI)",
  first_round: "First Round",
  offer_agreement: "Offer/Agreement",
  technical_round: "Technical Round",
  contract_offer: "Contract/Offer",
  onboarding: "Onboarding",
  rejected: "Rejected",
};

export const applicationStatusDescriptions: Record<ApplicationStatus, string> =
  {
    ai_screening: "AI-assisted first-round interview is being performed",
    first_round: "Candidate is in the first interview round",
    offer_agreement: "Offer or agreement is being discussed",
    technical_round: "Candidate is in the technical interview round",
    contract_offer: "Contract or formal offer stage",
    onboarding: "Candidate is in the onboarding process",
    rejected: "Application has been rejected",
  };

/** Pipeline stages still in progress (excludes rejected). */
export const applicationActivePipelineStatuses = applicationStatuses.filter(
  (status) => status !== "rejected",
);

export const applicationStatusBadgeVariants: Record<
  ApplicationStatus,
  "default" | "secondary" | "destructive"
> = {
  ai_screening: "secondary",
  first_round: "default",
  offer_agreement: "default",
  technical_round: "default",
  contract_offer: "default",
  onboarding: "default",
  rejected: "destructive",
};

export const applicationStatusKanbanColors: Record<ApplicationStatus, string> =
  {
    ai_screening: "bg-indigo-500",
    first_round: "bg-blue-500",
    offer_agreement: "bg-amber-500",
    technical_round: "bg-purple-500",
    contract_offer: "bg-green-500",
    onboarding: "bg-emerald-500",
    rejected: "bg-red-500",
  };

export const applicationStatusBorderColors: Record<ApplicationStatus, string> =
  {
    ai_screening: "border-l-indigo-500",
    first_round: "border-l-blue-500",
    offer_agreement: "border-l-amber-500",
    technical_round: "border-l-purple-500",
    contract_offer: "border-l-green-500",
    onboarding: "border-l-emerald-500",
    rejected: "border-l-red-500",
  };

export const applicationStatusChartColors: Record<ApplicationStatus, string> = {
  ai_screening: "#6366F1",
  first_round: "#3B82F6",
  offer_agreement: "#F59E0B",
  technical_round: "#A855F7",
  contract_offer: "#22C55E",
  onboarding: "#10B981",
  rejected: "#EF4444",
};

const legacyApplicationStatusLabels: Record<string, string> = {
  first_round_recruiter_call: applicationStatusLabels.first_round,
  second_round_technical_screening: applicationStatusLabels.technical_round,
  third_round_final_ceo: applicationStatusLabels.offer_agreement,
  withdrawn: applicationStatusLabels.rejected,
};

const legacyApplicationStatusMap: Record<string, ApplicationStatus> = {
  first_round_recruiter_call: "first_round",
  second_round_technical_screening: "technical_round",
  third_round_final_ceo: "offer_agreement",
  withdrawn: "rejected",
};

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (applicationStatuses as readonly string[]).includes(value);
}

export function normalizeApplicationStatus(
  status: string,
): ApplicationStatus | null {
  if (isApplicationStatus(status)) {
    return status;
  }
  return legacyApplicationStatusMap[status] ?? null;
}

export function getApplicationStatusLabel(status: string): string {
  if (isApplicationStatus(status)) {
    return applicationStatusLabels[status];
  }
  if (status in legacyApplicationStatusLabels) {
    return legacyApplicationStatusLabels[status]!;
  }
  return status.replace(/_/g, " ");
}

/** Raw application.status values that belong on a kanban column (includes legacy). */
export function getApplicationStatusesForKanbanColumn(
  columnStatus: ApplicationStatus,
): string[] {
  const legacyMatches = Object.entries(legacyApplicationStatusMap)
    .filter(([, normalized]) => normalized === columnStatus)
    .map(([legacy]) => legacy);

  return [columnStatus, ...legacyMatches];
}

/** Whether a global status filter includes this kanban column. */
export function kanbanColumnMatchesStatusFilter(
  columnStatus: ApplicationStatus,
  filterStatuses: string[] | undefined,
): boolean {
  if (!filterStatuses?.length) {
    return true;
  }

  return filterStatuses.some((status) => {
    const normalized = normalizeApplicationStatus(status);
    return normalized === columnStatus;
  });
}
