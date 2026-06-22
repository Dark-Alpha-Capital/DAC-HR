import { useState } from "react";
import ViewToggle from "./view-toggle";
import CandidateContainer from "./candidate-container";
import CandidateKanbanBoard from "./candidate-kanban-board";
import CandidatesPaginationControls from "~/components/candidates-pagination-controls";

type ViewMode = "table" | "kanban";

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  position: { id: string; name: string } | null;
  applicationStatus: string | null;
};

type Application = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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

interface CandidatesViewWrapperProps {
  candidates: Candidate[];
  applications: Application[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function CandidatesViewWrapper({
  candidates,
  applications,
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
}: CandidatesViewWrapperProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex items-center justify-end">
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      <div className="min-w-0 w-full overflow-hidden">
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <CandidateContainer
              candidates={candidates}
              currentPage={currentPage}
              limit={50}
            />
          </div>
        ) : (
          <CandidateKanbanBoard applications={applications} />
        )}
      </div>

      {totalPages > 1 && (
        <CandidatesPaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      )}
    </div>
  );
}
