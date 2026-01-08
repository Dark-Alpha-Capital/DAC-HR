"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

const ClearQuestionFiltersButton = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const hasFilters =
    searchParams.has("search") ||
    searchParams.has("position") ||
    searchParams.has("round");

  if (!hasFilters) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const params = new URLSearchParams(searchParams);
        params.delete("search");
        params.delete("position");
        params.delete("round");
        router.push(`?${params.toString()}`);
      }}
    >
      <X className="h-4 w-4 mr-2" />
      Clear Filters
    </Button>
  );
};

export default ClearQuestionFiltersButton;






