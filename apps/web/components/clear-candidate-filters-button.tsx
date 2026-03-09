"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

const ClearCandidateFiltersButton = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

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
        router.push(`?${params.toString()}`);
      }}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

export default ClearCandidateFiltersButton;
