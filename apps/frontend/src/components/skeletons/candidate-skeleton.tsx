import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export const CandidateLoadingSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
};
