import { useUrlSearchParams } from "@/lib/hooks/use-url-search-params";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { X } from "lucide-react";

const ClearEmployeeFiltersButton = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();

  const hasFilters =
    searchParams.has("position") ||
    searchParams.has("department") ||
    searchParams.has("name") ||
    searchParams.has("email");

  if (!hasFilters) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => {
        const params = new URLSearchParams(searchParams);
        params.delete("position");
        params.delete("department");
        params.delete("name");
        params.delete("email");
        setSearchParams(params);
      }}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

export default ClearEmployeeFiltersButton;
