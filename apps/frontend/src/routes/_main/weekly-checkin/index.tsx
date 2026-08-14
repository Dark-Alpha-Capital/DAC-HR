import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  WeeklyCheckinPage,
  WeeklyCheckinPagePending,
} from "#/features/weekly-checkin/components/weekly-checkin-page";
import { loadWeeklyCheckinForm } from "#/features/weekly-checkin/server/queries/weekly-checkin";

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
  pendingComponent: WeeklyCheckinPagePending,
});
