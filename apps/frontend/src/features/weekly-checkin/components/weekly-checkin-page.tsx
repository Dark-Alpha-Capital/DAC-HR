import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { Link, useLoaderData } from "@tanstack/react-router";
import WeeklyCheckinForm from "#/features/weekly-checkin/components/weekly-checkin-form";
import { Button } from "#/components/ui/button";

export function WeeklyCheckinPage() {
  const { positions, userName } = useLoaderData({
    from: "/_main/weekly-checkin/",
  });

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-8">
      <Button variant="secondary" asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>

      <WeeklyCheckinForm positions={positions} userName={userName} />
    </div>
  );
}

export function WeeklyCheckinPagePending() {
  return <ListPageSkeleton filterCount={2} showActions={false} />;
}
