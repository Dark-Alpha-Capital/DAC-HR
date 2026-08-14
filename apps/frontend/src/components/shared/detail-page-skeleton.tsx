import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

interface DetailPageSkeletonProps {
  container?: boolean;
  tabs?: boolean;
  tabCount?: number;
  showBreadcrumb?: boolean;
  showActions?: boolean;
  contentBlocks?: number;
}

export function DetailPageSkeleton({
  container = false,
  tabs = false,
  tabCount = 4,
  showBreadcrumb = false,
  showActions = true,
  contentBlocks = 2,
}: DetailPageSkeletonProps) {
  return (
    <div
      className={cn(
        "space-y-6",
        container && "container mx-auto max-w-4xl py-6",
      )}
      aria-busy="true"
      aria-label="Loading page"
    >
      {showBreadcrumb ? (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-start justify-between gap-4",
          showBreadcrumb && "border-b pb-6",
        )}
      >
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-5 w-48 max-w-full" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        {showActions ? (
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-9" />
          </div>
        ) : null}
      </div>

      {tabs ? (
        <>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: tabCount }, (_, index) => (
              <Skeleton key={index} className="h-9 w-28" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: contentBlocks }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
