import { useUrlSearchParams } from "~/lib/hooks/use-url-search-params";

import React from "react";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";

const ClearPositionFiltersButton = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();

  const hasFilters =
    searchParams.has("search") ||
    searchParams.has("hireLevel") ||
    searchParams.has("status");

  if (!hasFilters) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        const params = new URLSearchParams(searchParams);
        params.delete("search");
        params.delete("hireLevel");
        params.delete("status");
        setSearchParams(params);
      }}
    >
      <X className="h-4 w-4 mr-2" />
      Clear Filters
    </Button>
  );
};

export default ClearPositionFiltersButton;
