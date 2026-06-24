import { memo, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import CandidateKanbanCard from "~/components/candidate-kanban-card";
import { KanbanStatusHeader } from "~/components/application-status-badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import {
  useKanbanColumn,
  type KanbanFilters,
} from "~/hooks/queries/use-kanban-column";
import type { ApplicationStatus } from "@workspace/db/application-status";

interface CandidateKanbanColumnProps {
  status: ApplicationStatus;
  filters: KanbanFilters;
}

const SKELETON_COUNT = 5;

function KanbanCardSkeleton() {
  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-7 w-full" />
    </div>
  );
}

function CandidateKanbanColumnInner({
  status,
  filters,
}: CandidateKanbanColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    allItems,
    totalCount,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useKanbanColumn(status, filters);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;

    if (!root || !sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      {
        root,
        rootMargin: "120px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const loadedCount = allItems.length;

  return (
    <div className="w-64 shrink-0 lg:w-72 flex flex-col gap-3 min-h-0">
      <KanbanStatusHeader
        status={status}
        count={loadedCount}
        totalCount={totalCount}
      />

      <div
        ref={scrollRef}
        className="flex flex-col gap-3 min-h-0 flex-1 overflow-y-auto overscroll-y-contain pe-1"
        role="list"
      >
        {isLoading ? (
          Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <KanbanCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : isError ? (
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to load candidates"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : loadedCount === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-md bg-muted/30">
            No candidates
          </div>
        ) : (
          allItems.map((candidate) => (
            <div key={candidate.id} role="listitem">
              <CandidateKanbanCard
                candidate={{
                  ...candidate,
                  updatedAt: new Date(candidate.updatedAt),
                }}
                status={status}
              />
            </div>
          ))
        )}

        {isFetchingNextPage ? (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading more...
          </div>
        ) : null}

        {!isLoading && !hasNextPage && loadedCount > 0 ? (
          <p className="py-2 text-center text-[0.65rem] text-muted-foreground">
            End of column
          </p>
        ) : null}

        <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
      </div>
    </div>
  );
}

const CandidateKanbanColumn = memo(CandidateKanbanColumnInner);

export default CandidateKanbanColumn;
