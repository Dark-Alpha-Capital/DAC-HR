import { createFileRoute } from "@tanstack/react-router";
import { MeetingsListPage, MeetingsPending } from "#/features/attendance/components/meetings-list-page";
import { parseConferencesSearch } from "#/features/attendance/conferences-search";
import { meetingsQueryOptions } from "#/features/attendance/server/meet-attendance";

export const Route = createFileRoute("/_main/employees/attendance/")({
  head: () => ({
    meta: [{ title: "Meetings" }],
  }),
  validateSearch: parseConferencesSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    await queryClient.ensureQueryData(meetingsQueryOptions(deps));
  },
  pendingComponent: MeetingsPending,
  component: MeetingsListPage,
});
