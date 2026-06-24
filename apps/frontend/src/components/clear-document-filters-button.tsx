import { useUrlSearchParams } from "~/lib/hooks/use-url-search-params";

import React from "react";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";

const ClearDocumentFiltersButton = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();

  const hasFilters =
    searchParams.has("scope") ||
    searchParams.has("category") ||
    searchParams.has("name") ||
    searchParams.has("tags") ||
    searchParams.has("candidateId");

  if (!hasFilters) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => {
        const params = new URLSearchParams(searchParams);
        params.delete("scope");
        params.delete("category");
        params.delete("name");
        params.delete("tags");
        params.delete("candidateId");
        params.delete("page");
        setSearchParams(params);
      }}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

export default ClearDocumentFiltersButton;
