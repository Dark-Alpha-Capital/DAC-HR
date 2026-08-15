import { cn } from "#/lib/utils";
import {
  applicationStatusLabels,
  getApplicationStatusLabel,
  normalizeApplicationStatus,
  type ApplicationStatus,
} from "#/lib/application-status";

const statusBadgeClasses = {
  ai_screening:
    "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-100 dark:border-indigo-800",
  first_round:
    "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800",
  offer_agreement:
    "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800",
  technical_round:
    "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-800",
  contract_offer:
    "bg-green-100 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800",
  onboarding:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800",
  rejected:
    "bg-red-100 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800",
} satisfies Record<ApplicationStatus, string>;

const statusKanbanHeaderClasses = {
  ai_screening: "bg-indigo-500",
  first_round: "bg-blue-500",
  offer_agreement: "bg-amber-500",
  technical_round: "bg-purple-500",
  contract_offer: "bg-green-500",
  onboarding: "bg-emerald-500",
  rejected: "bg-red-500",
} satisfies Record<ApplicationStatus, string>;

const statusCardBorderClasses = {
  ai_screening: "border-l-indigo-500",
  first_round: "border-l-blue-500",
  offer_agreement: "border-l-amber-500",
  technical_round: "border-l-purple-500",
  contract_offer: "border-l-green-500",
  onboarding: "border-l-emerald-500",
  rejected: "border-l-red-500",
} satisfies Record<ApplicationStatus, string>;

export function getApplicationStatusCardBorderClass(status: string): string {
  const normalized = normalizeApplicationStatus(status);
  return normalized
    ? statusCardBorderClasses[normalized]
    : "border-l-gray-500";
}

interface ApplicationStatusBadgeProps {
  status: string;
  className?: string;
}

export function ApplicationStatusBadge({
  status,
  className,
}: ApplicationStatusBadgeProps) {
  const normalized = normalizeApplicationStatus(status);
  const label = getApplicationStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        normalized ? statusBadgeClasses[normalized] : "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {label}
    </span>
  );
}

interface KanbanStatusHeaderProps {
  status: ApplicationStatus;
  count: number;
  totalCount?: number;
}

export function KanbanStatusHeader({
  status,
  count,
  totalCount,
}: KanbanStatusHeaderProps) {
  const countLabel =
    totalCount !== undefined
      ? `${count} / ${totalCount}`
      : String(count);

  return (
    <div
      className={cn(
        statusKanbanHeaderClasses[status],
        "rounded-lg px-4 py-2.5 text-white font-semibold text-sm flex items-center justify-between shrink-0",
      )}
    >
      <span>{applicationStatusLabels[status]}</span>
      <span className="text-white/90 font-medium">({countLabel})</span>
    </div>
  );
}
