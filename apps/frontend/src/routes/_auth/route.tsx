import { createFileRoute } from "@tanstack/react-router";
import { AuthRouteLayout } from "#/features/auth/components/auth-route-layout";

export const Route = createFileRoute("/_auth")({
  component: AuthRouteLayout,
});
