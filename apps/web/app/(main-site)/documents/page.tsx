import React, { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getDocumentCategories,
  getDocuments,
} from "@workspace/db/repositories/document-repository";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import DocumentContainer from "./document-container";
import FilterDocumentCategory from "@/components/filter-document-category";
import FilterDocumentName from "@/components/filter-document-name";
import FilterDocumentTags from "@/components/filter-document-tags";
import ClearDocumentFiltersButton from "@/components/clear-document-filters-button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import DocumentCategoriesManager from "@/components/document-categories-manager";
import { cacheLife, cacheTag } from "next/cache";
import PaginationControls from "@/components/pagination-controls";
import { auth } from "@/auth";
import { headers } from "next/headers";
import type { DocumentCategory } from "@workspace/db/schema";

export const metadata: Metadata = {
  title: "Documents",
  description: "Documents list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const DocumentsPage = ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <Button asChild>
          <Link href="/documents/new">New Document</Link>
        </Button>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <AuthedDocuments searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default DocumentsPage;

async function AuthedDocuments({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Tabs defaultValue="documents" className="space-y-6">
      <TabsList>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
      </TabsList>

      <TabsContent value="documents" className="space-y-6">
        <Suspense fallback={<div>Loading filters...</div>}>
          <DocumentsTabContent searchParams={searchParams} />
        </Suspense>
      </TabsContent>

      <TabsContent value="categories">
        <Suspense fallback={<div>Loading categories...</div>}>
          <PresentCategories />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}

async function DocumentsTabContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const categories = await CachedDocumentCategories();

  return (
    <>
      <PresentFilters categories={categories} />
      <Suspense fallback={<div>Loading...</div>}>
        <PresentDocumentsWrapper searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function PresentFilters({ categories }: { categories: DocumentCategory[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterDocumentName />
      <FilterDocumentCategory categories={categories} />
      <FilterDocumentTags />
      <ClearDocumentFiltersButton />
    </div>
  );
}

async function CachedDocumentCategories() {
  "use cache";
  cacheLife("hr-data");
  cacheTag("documents");
  return getDocumentCategories();
}

// Cached function for documents
async function CachedDocuments(
  categoryFilters?: string[],
  nameSearch?: string,
  tagsSearch?: string,
  currentPage?: number,
) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("documents");

  const limit = 50;
  const page = currentPage || 1;

  return await getDocuments(
    categoryFilters,
    nameSearch,
    tagsSearch,
    page,
    limit,
  );
}

// Component (not cached) reads runtime data
const PresentDocumentsWrapper = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const params = await searchParams;
  const { category, name, tags, page: pageParam } = params;

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

  // Extract page number (default to 1)
  const page = pageParam
    ? typeof pageParam === "string"
      ? parseInt(pageParam, 10)
      : Array.isArray(pageParam) && pageParam[0]
        ? parseInt(pageParam[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;

  const { documents, total } = await CachedDocuments(
    categoryFilters,
    nameSearch,
    tagsSearch,
    currentPage,
  );

  const limit = 50;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
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

  return (
    <div className="space-y-6">
      <DocumentContainer documents={documents as any} />
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          basePath="/documents"
        />
      )}
    </div>
  );
};

const PresentCategories = async () => {
  "use cache";
  cacheLife("hr-data");
  cacheTag("documents");

  const categories = await getDocumentCategories();

  return <DocumentCategoriesManager categories={categories} />;
};
