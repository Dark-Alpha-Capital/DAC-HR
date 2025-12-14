import React, { Suspense } from "react";
import { Metadata } from "next";
import { getDocuments } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import DocumentContainer from "./document-container";
import { UserAuthenticated } from "@/components/auth-checks";
import FilterDocumentCategory from "@/components/filter-document-category";
import FilterDocumentName from "@/components/filter-document-name";
import FilterDocumentTags from "@/components/filter-document-tags";
import ClearDocumentFiltersButton from "@/components/clear-document-filters-button";
import { cacheLife, cacheTag } from "next/cache";

export const metadata: Metadata = {
  title: "Documents",
  description: "Documents list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const DocumentsPage = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Button asChild>
          <Link href="/documents/new">New Document</Link>
        </Button>
      </div>

      <Suspense>
        <PresentFilters />
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        <PresentDocumentsWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default DocumentsPage;

const PresentFilters = () => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterDocumentName />
      <FilterDocumentCategory />
      <FilterDocumentTags />
      <ClearDocumentFiltersButton />
    </div>
  );
};

// Cached function for documents
async function CachedDocuments(
  categoryFilters?: string[],
  nameSearch?: string,
  tagsSearch?: string
) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("documents");

  return await getDocuments(categoryFilters, nameSearch, tagsSearch);
}

// Component (not cached) reads runtime data
const PresentDocumentsWrapper = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const params = await searchParams;
  const { category, name, tags } = params;

  // Extract category filters from the category parameter
  const categoryFilters = category
    ? Array.isArray(category)
      ? category
      : [category]
    : undefined;

  // Extract name search
  const nameSearch = typeof name === "string" ? name : undefined;

  // Extract tags search
  const tagsSearch = typeof tags === "string" ? tags : undefined;

  const documents = await CachedDocuments(
    categoryFilters,
    nameSearch,
    tagsSearch
  );

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {categoryFilters || nameSearch || tagsSearch
            ? "No documents found matching the selected filters."
            : "No documents found. Create your first document to get started."}
        </p>
        <Button asChild className="mt-4">
          <Link href="/documents/new">Add your first document</Link>
        </Button>
      </div>
    );
  }

  return <DocumentContainer documents={documents} />;
};
