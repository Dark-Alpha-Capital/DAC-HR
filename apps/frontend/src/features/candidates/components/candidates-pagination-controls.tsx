import { useUrlSearchParams } from "#/lib/hooks/use-url-search-params";
import { Button } from "#/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { getPaginationRange } from "#/lib/pagination-range";

const CandidatesPaginationControls = ({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  totalCount,
  pageItemCount,
  limit,
}: {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
  pageItemCount: number;
  limit: number;
}) => {
  const { searchParams, setSearchParams } = useUrlSearchParams();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);

    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }

    setSearchParams(params, "/candidates");
  };

  if (totalCount === 0) {
    return null;
  }

  const rangeStart = pageItemCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const rangeEnd = pageItemCount === 0 ? 0 : rangeStart + pageItemCount - 1;
  const pageItems = getPaginationRange(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {totalPages > 1 ? (
          <>
            Showing {rangeStart}–{rangeEnd} of {totalCount} candidates (page{" "}
            {currentPage} of {totalPages})
          </>
        ) : (
          <>Showing {totalCount} candidates</>
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
};

export default CandidatesPaginationControls;
