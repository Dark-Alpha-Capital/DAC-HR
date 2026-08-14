import { createFileRoute } from "@tanstack/react-router";
import {
  ScreenersListPage,
  ScreenersListPending,
} from "#/features/screeners/components/screeners-list-page";
import { loadScreenersIndex } from "#/features/screeners/server/queries/screeners";

export const Route = createFileRoute("/_main/screeners/")({
  head: () => ({
    meta: [{ title: "Screeners" }],
  }),
  loader: async () => loadScreenersIndex(),
  component: ScreenersListPage,
  pendingComponent: ScreenersListPending,
});
