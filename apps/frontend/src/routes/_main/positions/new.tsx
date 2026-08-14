import { createFileRoute } from "@tanstack/react-router";
import { PositionNewPage } from "#/features/positions/components/position-new-page";

export const Route = createFileRoute("/_main/positions/new")({
  head: () => ({
    meta: [{ title: "New Position" }],
  }),
  component: PositionNewPage,
});
