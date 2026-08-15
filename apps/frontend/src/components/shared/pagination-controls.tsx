import { useUrlSearchParams } from "#/lib/hooks/use-url-search-params";

import React from "react";
import { Button } from "#/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { getPaginationRange } from "#/lib/pagination-range";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  /** Route path to navigate with; defaults to the current path. */
  basePath?: string;
  /** "simple" renders prev/next only; "numbered" adds a page-number range. */
  variant?: "simple" | "numbered";
  totalCount?: number;
  pageItemCount?: number;
  limit?: number;
  /** Item label for the numbered summary (e.g. "candidates", "records"). */
  itemLabel?: string;
  /** Hide the whole control when there are no rows. */
  hideWhenEmpty?: boolean;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  basePath,
  variant = "simple",
  totalCount = 0,
  pageItemCount = 0,
  limit = 1,
  itemLabel = "items",
  hideWhenEmpty = false,
}: PaginationControlsProps) {
  const { searchParams, setSearchParams } = useUrlSearchParams();

  if (hideWhenEmpty && totalCount === 0) {
    return null;
  }

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);

    // Remove page param if going to page 1
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }

    setSearchParams(params, basePath);
  };

  if (variant === "numbered") {
    const rangeStart = pageItemCount === 0 ? 0 : (currentPage - 1) * limit + 1;
    const rangeEnd = pageItemCount === 0 ? 0 : rangeStart + pageItemCount - 1;
    const pageItems = getPaginationRange(currentPage, totalPages);

    return (
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {totalPages > 1 ? (
            <>
              Showing {rangeStart}–{rangeEnd} of {totalCount} {itemLabel} (page{" "}
              {currentPage} of {totalPages})
            </>
          ) : (
            <>
              Showing {totalCount} {itemLabel}
            </>
          )}
        </div>
        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateToPage(currentPage - 1)}
              disabled={!hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            {pageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex size-8 items-center justify-center text-muted-foreground"
                  aria-hidden
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === currentPage ? "outline" : "ghost"}
                  size="icon-sm"
                  onClick={() => navigateToPage(item)}
                  aria-current={item === currentPage ? "page" : undefined}
                >
                  {item}
                </Button>
              ),
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateToPage(currentPage + 1)}
              disabled={!hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-muted-foreground">
        Showing page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={!hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={!hasNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
