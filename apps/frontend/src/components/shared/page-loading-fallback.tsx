import { Skeleton } from "#/components/ui/skeleton";

export function PageLoadingFallback() {
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6 md:py-8"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
