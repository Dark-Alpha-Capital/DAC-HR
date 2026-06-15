import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  getDocumentCategories,
  getDocuments,
} from "@workspace/db/repositories/document-repository";
import DocumentContainer from "@/components/document-container";
import FilterDocumentCategory from "@/components/filter-document-category";
import FilterDocumentName from "@/components/filter-document-name";
import FilterDocumentTags from "@/components/filter-document-tags";
import ClearDocumentFiltersButton from "@/components/clear-document-filters-button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import DocumentCategoriesManager from "@/components/document-categories-manager";
import PaginationControls from "@/components/pagination-controls";
import {
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "@/lib/parse-search";

export const Route = createFileRoute("/_main/documents/")({
  head: () => ({
    meta: [{ title: "Documents" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    category: toStringArray(search.category as string | string[] | undefined),
    name: toOptionalString(search.name),
    tags: toOptionalString(search.tags),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [categories, documentsResult] = await Promise.all([
      getDocumentCategories(),
      getDocuments(deps.category, deps.name, deps.tags, currentPage, limit),
    ]);

    const { documents, total } = documentsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      categories,
      documents,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(deps.category?.length || deps.name || deps.tags),
    };
  },
  component: DocumentsPage,
});

function DocumentsPage() {
  const {
    categories,
    documents,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
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
          <div className="flex flex-wrap items-center gap-2">
            <FilterDocumentName />
            <FilterDocumentCategory categories={categories} />
            <FilterDocumentTags />
            <ClearDocumentFiltersButton />
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center">
              <p className="text-muted-foreground">
                {hasFilters
                  ? "No documents found matching the selected filters."
                  : "No documents found. Create your first document to get started."}
              </p>
              <Button asChild className="mt-4">
                <Link to="/documents/new" search="{}">
                  Add your first document
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <DocumentContainer documents={documents} />
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
