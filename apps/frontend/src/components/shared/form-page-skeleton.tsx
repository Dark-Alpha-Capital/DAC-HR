import { Skeleton } from "#/components/ui/skeleton";

interface FormPageSkeletonProps {
  fieldCount?: number;
  showBack?: boolean;
}

export function FormPageSkeleton({
  fieldCount = 6,
  showBack = true,
}: FormPageSkeletonProps) {
  return (
    <div
      className="mx-auto max-w-2xl space-y-6"
      aria-busy="true"
      aria-label="Loading page"
    >
      {showBack ? <Skeleton className="h-9 w-24" /> : null}

      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="space-y-6 rounded-xl border p-6">
        {Array.from({ length: fieldCount }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
