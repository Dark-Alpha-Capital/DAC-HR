import { Skeleton } from "#/components/ui/skeleton";

export function MainLayoutSkeleton() {
  return (
    <div className="flex min-h-svh w-full">
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-4 md:w-14">
        <Skeleton className="mb-4 size-8 rounded-md" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="size-7 rounded-md" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
        <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">
          <Skeleton className="mb-4 h-8 w-56" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
