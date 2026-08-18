import { createFileRoute } from "@tanstack/react-router";
import { UnauthorizedPage } from "#/features/auth/components/unauthorized-page";

export const Route = createFileRoute("/_auth/unauthorized")({
  head: () => ({
    meta: [{ title: "Access Denied - DAC-HR" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: UnauthorizedPage,
});
