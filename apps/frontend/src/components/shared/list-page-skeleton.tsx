import { Skeleton } from "~/components/ui/skeleton";

interface ListPageSkeletonProps {
  filterCount?: number;
  rowCount?: number;
  showActions?: boolean;
  layout?: "table" | "cards";
}

export function ListPageSkeleton({
  filterCount = 4,
  rowCount = 6,
  showActions = true,
  layout = "table",
}: ListPageSkeletonProps) {
  return (
    <div
      className="w-full min-w-0 space-y-6"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-8 w-40" />
        {showActions ? (
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: filterCount }, (_, index) => (
          <Skeleton key={index} className="h-9 w-36" />
        ))}
      </div>

      {layout === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rowCount }, (_, index) => (
            <div key={index} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="space-y-0 border-b bg-muted/30 p-3">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="divide-y">
            {Array.from({ length: rowCount }, (_, index) => (
              <div key={index} className="flex items-center gap-4 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 max-w-xs flex-1" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="ml-auto h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
