import { Skeleton } from "@/components/ui/skeleton";

export function MainLayoutSkeleton() {
  return (
    <div className="flex min-h-svh w-full">
      <div className="hidden w-64 shrink-0 border-r bg-sidebar p-4 md:block">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b px-4">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex-1 px-4 py-6 md:px-6 md:py-8">
          <Skeleton className="mb-4 h-8 w-56" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
