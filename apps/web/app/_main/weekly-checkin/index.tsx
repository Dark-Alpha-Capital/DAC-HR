import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getPositions } from "@workspace/db/queries";
import WeeklyCheckinForm from "@/components/forms/weekly-checkin-form";
import { Button } from "@workspace/ui/components/button";
import { getSession } from "@/lib/middleware/auth-guard";
import { hasWeeklyCheckinViewerAccess } from "@/lib/config/weekly-checkin-access";

export const Route = createFileRoute("/_main/weekly-checkin/")({
  head: () => ({
    meta: [{ title: "Weekly Check-in" }],
  }),
  loader: async () => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    if (!hasWeeklyCheckinViewerAccess(session.user.email)) {
      throw redirect({ to: "/dashboard" });
    }

    const { positions } = await getPositions();

    return {
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      userName: session.user.name || undefined,
    };
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
