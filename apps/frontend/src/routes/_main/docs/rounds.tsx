import { createFileRoute } from "@tanstack/react-router";
import { RoundsDocsPage as RoundsPage } from "#/features/docs/components/rounds-page";

export const Route = createFileRoute("/_main/docs/rounds")({
  head: () => ({
    meta: [{ title: "Rounds - DAC HR" }],
  }),
  component: RoundsPage,
});
