"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ApplicationsPaginationControls = ({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
}: {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    
    // Remove page param if going to page 1
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    
    router.push(`/applications?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-muted-foreground">
        Showing page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={!hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
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
};

export default ApplicationsPaginationControls;

