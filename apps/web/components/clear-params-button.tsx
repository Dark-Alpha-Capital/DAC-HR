import { useUrlSearchParams } from "@/lib/hooks/use-url-search-params";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { X } from "lucide-react";

const ClearParamsButton = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label="Clear type filter"
      onClick={() => {
        const params = new URLSearchParams(searchParams);
        params.delete("type");
        setSearchParams(params);
      }}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

export default ClearParamsButton;
