"use client";

import { useOptimistic, useTransition, useState, useMemo } from "react";
import { updateApplicationStatus } from "@/lib/actions/application-actions";
import ApplicationCard from "@/components/application-card";
import { toast } from "sonner";

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

const STATUS_COLORS: Record<
  ApplicationStatus,
  "default" | "secondary" | "destructive"
> = {
  ai_screening: "secondary",
  first_round_recruiter_call: "default",
  second_round_technical_screening: "default",
  third_round_final_ceo: "default",
  contract_offer: "default",
  onboarding: "default",
  rejected: "destructive",
  withdrawn: "secondary",
};

// Column header colors matching the image design
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

// Card left-edge color bars matching column colors
const CARD_BORDER_COLORS: Record<ApplicationStatus, string> = {
  ai_screening: "border-l-indigo-500",
  first_round_recruiter_call: "border-l-blue-500",
  second_round_technical_screening: "border-l-purple-500",
  third_round_final_ceo: "border-l-amber-500",
  contract_offer: "border-l-green-500",
  onboarding: "border-l-emerald-500",
  rejected: "border-l-red-500",
  withdrawn: "border-l-gray-500",
};

export default function KanbanBoard({
  applications: initialApplications,
}: KanbanBoardProps) {
  const [applications, setApplications] = useState(() =>
    initialApplications.map((app) => ({
      ...app,
      createdAt:
        typeof app.createdAt === "string"
          ? new Date(app.createdAt)
          : app.createdAt,
      updatedAt:
        typeof app.updatedAt === "string"
          ? new Date(app.updatedAt)
          : app.updatedAt,
    })),
  );
  const [isPending, startTransition] = useTransition();
  const [draggedApplicationId, setDraggedApplicationId] = useState<
    string | null
  >(null);
  const [dragOverStatus, setDragOverStatus] =
    useState<ApplicationStatus | null>(null);

  const [optimisticApplications, setOptimisticApplications] = useOptimistic(
    applications,
    (
      state,
      {
        applicationId,
        newStatus,
      }: { applicationId: string; newStatus: ApplicationStatus },
    ) => {
      return state.map((app) =>
        app.id === applicationId ? { ...app, status: newStatus } : app,
      );
    },
  );

  const columns = useMemo(() => {
    const grouped = new Map<ApplicationStatus, Application[]>();

    APPLICATION_STATUSES.forEach((status) => {
      grouped.set(status, []);
    });

    optimisticApplications.forEach((app) => {
      const status = app.status as ApplicationStatus;
      if (APPLICATION_STATUSES.includes(status)) {
        const column = grouped.get(status);
        if (column) {
          column.push(app);
        }
      }
    });

    return grouped;
  }, [optimisticApplications]);

  const handleDragStart = (e: React.DragEvent, applicationId: string) => {
    setDraggedApplicationId(applicationId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("applicationId", applicationId);
  };

  const handleDragOver = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: ApplicationStatus) => {
    e.preventDefault();
    setDragOverStatus(null);

    const applicationId = e.dataTransfer.getData("applicationId");
    if (!applicationId) return;

    const application = applications.find((app) => app.id === applicationId);
    if (!application) return;

    const currentStatus = application.status as ApplicationStatus;
    if (currentStatus === targetStatus) {
      setDraggedApplicationId(null);
      return;
    }

    const previousState = [...applications];

    startTransition(async () => {
      setOptimisticApplications({ applicationId, newStatus: targetStatus });

      const result = await updateApplicationStatus(applicationId, targetStatus);

      if (!result.success) {
        setApplications(previousState);
        toast.error(
          `Couldn't move candidate to ${STATUS_LABELS[targetStatus]}. Please try again.`,
        );
        return;
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: targetStatus } : app,
        ),
      );
    });

    setDraggedApplicationId(null);
  };

  const handleDragEnd = () => {
    setDraggedApplicationId(null);
    setDragOverStatus(null);
  };

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
          const isDragOver = dragOverStatus === status;

          return (
            <div
              key={status}
              className={`w-64 sm:w-72 shrink-0 flex flex-col gap-3 transition-colors ${
                isDragOver ? "opacity-60" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
              aria-label={`${STATUS_LABELS[status]} column`}
            >
              {/* Column Header with distinct color */}
              <div
                className={`${COLUMN_COLORS[status]} rounded-lg px-4 py-2.5 text-white font-semibold text-sm flex items-center justify-between`}
              >
                <span>{STATUS_LABELS[status]}</span>
                <span className="text-white/90 font-medium">
                  ({columnApps.length})
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex flex-col gap-3 min-h-[100px]" role="list">
                {columnApps.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-md bg-muted/30">
                    Drop candidates here
                  </div>
                ) : (
                  columnApps.map((app) => (
                    <div
                      key={app.id}
                      role="listitem"
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing transition-all ${
                        draggedApplicationId === app.id
                          ? "opacity-50 scale-95"
                          : ""
                      }`}
                    >
                      <ApplicationCard
                        application={{
                          ...app,
                          createdAt:
                            app.createdAt instanceof Date
                              ? app.createdAt
                              : new Date(app.createdAt),
                          updatedAt:
                            app.updatedAt instanceof Date
                              ? app.updatedAt
                              : new Date(app.updatedAt),
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
