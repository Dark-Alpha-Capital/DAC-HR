import { Skeleton } from "@workspace/ui/components/skeleton";

export const CandidateDetailSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-9 w-64" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Information */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="pt-4 border-t">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>

        {/* Applications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-3 p-3 border rounded-md">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-24" />
                  <div className="flex gap-1 ml-auto">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-6" />
                  </div>
                </div>
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="space-y-1.5">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between"
                      >
                        <Skeleton className="h-3 w-28" />
                        <div className="flex gap-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
