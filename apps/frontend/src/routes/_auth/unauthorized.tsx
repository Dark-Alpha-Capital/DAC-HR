import { createFileRoute } from "@tanstack/react-router";
import { UnauthorizedPage } from "#/features/auth/components/unauthorized-page";

export const Route = createFileRoute("/_auth/unauthorized")({
  head: () => ({
    meta: [{ title: "Access Denied - DAC-HR" }],
  }),
  component: UnauthorizedPage,
});
