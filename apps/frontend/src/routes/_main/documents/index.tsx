import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import DocumentContainer from "~/components/document-container";
import FilterDocumentCategory from "~/components/filter-document-category";
import FilterDocumentName from "~/components/filter-document-name";
import FilterDocumentScope from "~/components/filter-document-scope";
import ClearDocumentFiltersButton from "~/components/clear-document-filters-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import DocumentCategoriesManager from "~/components/document-categories-manager";
import PaginationControls from "~/components/pagination-controls";
import { loadDocumentsIndex } from "~/lib/loaders/documents";
import {
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";

function parseDocumentsSearch(search: Record<string, unknown>) {
  return {
    scope: toOptionalString(search.scope),
    category: toStringArray(search.category as string | string[] | undefined),
    name: toOptionalString(search.name),
    candidateId: toOptionalString(search.candidateId),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

type DocumentsIndexSearch = ReturnType<typeof parseDocumentsSearch>;
type DocumentsIndexData = Awaited<ReturnType<typeof loadDocumentsIndex>>;

function documentsIndexQueryOptions(deps: DocumentsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.documents.list(deps),
    queryFn: async (): Promise<DocumentsIndexData> =>
      loadDocumentsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}

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
  component: DocumentsPage,
});

function DocumentsPage() {
  const search = Route.useSearch();
  const { data, isLoading, isFetching }: UseQueryResult<DocumentsIndexData> =
    useQuery(documentsIndexQueryOptions(search));

  if (isLoading && !data) {
    return <ListPageSkeleton />;
  }

  if (!data) {
    return null;
  }

  const {
    scope,
    categories,
    documents,
    currentPage,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = data;

  const showCandidateColumn = scope === "candidates" || scope === "all";
  const showFirmCategoryFilter = scope === "firm" || scope === "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Firm templates and reference docs, plus candidate files — all in one
            place.
          </p>
        </div>
        <Button asChild>
          <Link to="/documents/new" search="{}">
            New Document
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <div
            className="flex flex-wrap items-center gap-2 transition-opacity"
            style={{ opacity: isFetching ? 0.7 : 1 }}
          >
            <FilterDocumentName />
            <FilterDocumentScope />
            {showFirmCategoryFilter ? (
              <FilterDocumentCategory categories={categories} />
            ) : null}
            <ClearDocumentFiltersButton />
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center">
              <p className="text-muted-foreground">
                {hasFilters
                  ? "No documents found matching the selected filters."
                  : scope === "candidates"
                    ? "No candidate documents found."
                    : "No documents found. Create your first document to get started."}
              </p>
              {scope === "firm" ? (
                <Button asChild className="mt-4">
                  <Link to="/documents/new" search="{}">
                    Add your first document
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                {total} document{total === 1 ? "" : "s"}
                {totalPages > 1
                  ? ` · page ${currentPage} of ${totalPages}`
                  : null}
              </div>
              <DocumentContainer
                documents={documents}
                showCandidateColumn={showCandidateColumn}
              />
              {totalPages > 1 ? (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  hasNextPage={hasNextPage}
                  hasPreviousPage={hasPreviousPage}
                  basePath="/documents"
                />
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <DocumentCategoriesManager categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
