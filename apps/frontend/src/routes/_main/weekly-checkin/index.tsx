import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { loadWeeklyCheckinForm } from "~/lib/loaders/weekly-checkin";
import WeeklyCheckinForm from "~/components/forms/weekly-checkin-form";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_main/weekly-checkin/")({
  head: () => ({
    meta: [{ title: "Weekly Check-in" }],
  }),
  loader: async () => {
    const result = await loadWeeklyCheckinForm();
    if ("accessDenied" in result && result.accessDenied) {
      throw redirect({ to: "/dashboard" });
    }
    const { accessDenied: _, ...data } = result;
    return data;
  },
  component: WeeklyCheckinPage,
});

function WeeklyCheckinPage() {
  const { positions, userName } = Route.useLoaderData();

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-8">
      <Button variant="secondary" asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>

      <WeeklyCheckinForm positions={positions} userName={userName} />
    </div>
  );
}
