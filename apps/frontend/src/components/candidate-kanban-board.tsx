
import { useMemo } from "react";
import ApplicationCard from "~/components/application-card";

type ApplicationStatus =
  | "ai_screening"
  | "first_round_recruiter_call"
  | "second_round_technical_screening"
  | "third_round_final_ceo"
  | "contract_offer"
  | "onboarding"
  | "rejected"
  | "withdrawn";

type Application = {
  id: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  position: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  interviews: Array<{
    id: string;
    status: string;
  }>;
};

interface KanbanBoardProps {
  applications: Application[];
}

const APPLICATION_STATUSES: ApplicationStatus[] = [
  "ai_screening",
  "first_round_recruiter_call",
  "second_round_technical_screening",
  "third_round_final_ceo",
  "contract_offer",
  "onboarding",
  "rejected",
  "withdrawn",
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  ai_screening: "AI Screening",
  first_round_recruiter_call: "1st Round Recruiter Call",
  second_round_technical_screening: "2nd Round Technical Screening",
  third_round_final_ceo: "3rd Round Final Round with CEO",
  contract_offer: "Contract/Offer",
  onboarding: "Onboarding",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const COLUMN_COLORS: Record<ApplicationStatus, string> = {
  ai_screening: "bg-indigo-500",
  first_round_recruiter_call: "bg-blue-500",
  second_round_technical_screening: "bg-purple-500",
  third_round_final_ceo: "bg-amber-500",
  contract_offer: "bg-green-500",
  onboarding: "bg-emerald-500",
  rejected: "bg-red-500",
  withdrawn: "bg-gray-500",
};

function normalizeDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export default function KanbanBoard({ applications }: KanbanBoardProps) {
  const columns = useMemo(() => {
    const grouped = new Map<ApplicationStatus, Application[]>();

    APPLICATION_STATUSES.forEach((status) => {
      grouped.set(status, []);
    });

    applications.forEach((app) => {
      const status = app.status as ApplicationStatus;
      if (APPLICATION_STATUSES.includes(status)) {
        grouped.get(status)?.push(app);
      }
    });

    return grouped;
  }, [applications]);

  if (applications.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="text-muted-foreground">No applications found.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
        {APPLICATION_STATUSES.map((status) => {
          const columnApps = columns.get(status) || [];

          return (
            <div
              key={status}
              className="w-64 sm:w-72 shrink-0 flex flex-col gap-3"
              aria-label={`${STATUS_LABELS[status]} column`}
            >
              <div
                className={`${COLUMN_COLORS[status]} rounded-lg px-4 py-2.5 text-white font-semibold text-sm flex items-center justify-between`}
              >
                <span>{STATUS_LABELS[status]}</span>
                <span className="text-white/90 font-medium">
                  ({columnApps.length})
                </span>
              </div>

              <div className="flex flex-col gap-3 min-h-[100px]" role="list">
                {columnApps.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-md bg-muted/30">
                    No candidates
                  </div>
                ) : (
                  columnApps.map((app) => (
                    <div key={app.id} role="listitem">
                      <ApplicationCard
                        application={{
                          ...app,
                          createdAt: normalizeDate(app.createdAt),
                          updatedAt: normalizeDate(app.updatedAt),
                        }}
                        status={status}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
