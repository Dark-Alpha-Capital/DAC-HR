import {
  applicationStatuses,
  type ApplicationStatus,
} from "@workspace/db/application-status";
import CandidateKanbanColumn from "#/features/candidates/components/candidate-kanban-column";
import type { KanbanFilters } from "#/features/candidates/kanban-types";

interface CandidateKanbanBoardProps {
  filters: KanbanFilters;
}

export default function CandidateKanbanBoard({
  filters,
}: CandidateKanbanBoardProps) {
  return (
    <div className="w-full min-w-0 h-[calc(100vh-14rem)] min-h-[420px] overflow-x-auto overscroll-x-contain">
      <div className="flex h-full w-max gap-3 md:gap-4 pb-4 pe-6">
        {applicationStatuses.map((status: ApplicationStatus) => (
          <CandidateKanbanColumn
            key={status}
            status={status}
            filters={filters}
          />
        ))}
      </div>
    </div>
  );
}
