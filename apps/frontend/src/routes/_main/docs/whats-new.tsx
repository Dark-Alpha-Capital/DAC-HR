import { createFileRoute } from "@tanstack/react-router";
import { WhatsNewDocsPage as WhatsNewPage } from "#/features/docs/components/whats-new-page";

export const Route = createFileRoute("/_main/docs/whats-new")({
  head: () => ({
    meta: [{ title: "What's New - DAC HR" }],
  }),
  component: WhatsNewPage,
});
