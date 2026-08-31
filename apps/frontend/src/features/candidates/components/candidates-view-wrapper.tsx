import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { queryKeys } from "#/lib/query/query-keys";
import ViewToggle from "./view-toggle";
import CandidateContainer from "./candidate-container";
import CandidateKanbanBoard from "./candidate-kanban-board";
import PaginationControls from "#/components/shared/pagination-controls";
import type { CandidateViewMode } from "#/features/candidates/helpers";
import type { KanbanFilters } from "#/features/candidates/kanban-types";
import type { ApplicationStatus } from "#/lib/application-status";

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  locationCity: string | null;
  locationState: string | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  position: { id: string; name: string } | null;
  applicationStatus: ApplicationStatus;
};

interface CandidatesViewWrapperProps {
  viewMode: CandidateViewMode;
  onViewModeChange: (mode: CandidateViewMode) => void;
  candidates: Candidate[];
  kanbanFilters: KanbanFilters;
  currentPage: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function CandidatesViewWrapper({
  viewMode,
  onViewModeChange,
  candidates,
  kanbanFilters,
  currentPage,
  limit,
  totalCount,
  totalPages,
  hasNextPage,
  hasPreviousPage,
}: CandidatesViewWrapperProps) {
  const isTableView = viewMode === "table";
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Mark all candidate, application, and kanban queries stale and refetch
      // the active ones so newly added candidates surface without a full reload.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.candidates.all,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.applications.all,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh candidates"
          title="Refresh candidates"
        >
          <RefreshCw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          />
        </Button>
        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>

      <div className="min-w-0 w-full overflow-hidden">
        {isTableView ? (
          <div className="overflow-x-auto">
            <CandidateContainer
              candidates={candidates}
              currentPage={currentPage}
              limit={limit}
            />
          </div>
        ) : (
          <CandidateKanbanBoard filters={kanbanFilters} />
        )}
      </div>

      {isTableView ? (
        <PaginationControls
          variant="numbered"
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          totalCount={totalCount}
          pageItemCount={candidates.length}
          limit={limit}
          itemLabel="candidates"
          basePath="/candidates"
          hideWhenEmpty
        />
      ) : null}
    </div>
  );
}
