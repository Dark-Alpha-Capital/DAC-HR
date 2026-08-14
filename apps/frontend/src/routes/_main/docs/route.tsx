import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DocsLayout } from "#/features/docs/components/docs-layout";

export const Route = createFileRoute("/_main/docs")({
  component: DocsLayout,
});
