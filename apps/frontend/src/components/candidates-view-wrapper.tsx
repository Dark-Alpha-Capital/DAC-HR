import ViewToggle from "./view-toggle";
import CandidateContainer from "./candidate-container";
import CandidateKanbanBoard from "./candidate-kanban-board";
import CandidatesPaginationControls from "~/components/candidates-pagination-controls";
import type { CandidateViewMode } from "~/lib/parse-search";
import type { KanbanFilters } from "~/lib/kanban/types";

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
  applicationStatus: string | null;
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

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex items-center justify-end">
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
        <CandidatesPaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          totalCount={totalCount}
          pageItemCount={candidates.length}
          limit={limit}
        />
      ) : null}
    </div>
  );
}
