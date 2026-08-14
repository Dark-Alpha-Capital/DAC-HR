import { createFileRoute } from "@tanstack/react-router";
import { DocsPage as DocsIndexPage } from "#/features/docs/components/docs-index-page";

export const Route = createFileRoute("/_main/docs/")({
  head: () => ({
    meta: [{ title: "Documentation - DAC HR" }],
  }),
  component: DocsIndexPage,
});
