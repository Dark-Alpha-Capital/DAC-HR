import { createFileRoute } from "@tanstack/react-router";
import { PositionsDocsPage as PositionsPage } from "#/features/docs/components/positions-page";

export const Route = createFileRoute("/_main/docs/positions")({
  head: () => ({
    meta: [{ title: "Positions - DAC HR" }],
  }),
  component: PositionsPage,
});
