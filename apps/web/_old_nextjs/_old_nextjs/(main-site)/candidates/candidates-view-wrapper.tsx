"use client";

import { useState } from "react";
import ViewToggle from "./view-toggle";
import CandidateContainer from "./candidate-container";
import KanbanBoard from "./kanban-board";
import CandidatesPaginationControls from "@/components/candidates-pagination-controls";

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
    <div className="space-y-6 w-full overflow-x-hidden">
      <div className="flex items-center justify-end">
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      <div className="w-full overflow-x-hidden">
        {viewMode === "table" ? (
          <div className="overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6">
            <CandidateContainer
              candidates={candidates}
              currentPage={currentPage}
              limit={50}
            />
          </div>
        ) : (
          <KanbanBoard applications={applications} />
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
