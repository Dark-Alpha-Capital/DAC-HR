import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { DocumentsListPage } from "#/features/documents/components/documents-list-page";
import {
  parseDocumentsSearch,
  documentsIndexQueryOptions,
} from "#/features/documents/server/queries/documents";

export const Route = createFileRoute("/_main/documents/")({
  head: () => ({
    meta: [{ title: "Documents" }],
  }),
  validateSearch: parseDocumentsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseDocumentsSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(documentsIndexQueryOptions(search));
  },
  pendingComponent: () => <ListPageSkeleton />,
  component: DocumentsListPage,
});
