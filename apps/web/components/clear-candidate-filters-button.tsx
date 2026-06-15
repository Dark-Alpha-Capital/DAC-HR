import { useUrlSearchParams } from "@/lib/hooks/use-url-search-params";

import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ClearCandidateFiltersButton = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();

  const hasFilters =
    searchParams.has("name") ||
    searchParams.has("email") ||
    searchParams.has("position");

  if (!hasFilters) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label="Clear candidate filters"
      onClick={() => {
        const params = new URLSearchParams(searchParams);
        params.delete("name");
        params.delete("email");
        params.delete("position");
        setSearchParams(params);
      }}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

export default ClearCandidateFiltersButton;
