import { createFileRoute } from "@tanstack/react-router";
import { DocumentsDocsPage as DocumentsPage } from "#/features/docs/components/documents-page";

export const Route = createFileRoute("/_main/docs/documents")({
  head: () => ({
    meta: [{ title: "Documents - DAC HR" }],
  }),
  component: DocumentsPage,
});
