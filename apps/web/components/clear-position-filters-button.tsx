"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

const ClearPositionFiltersButton = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const hasFilters = searchParams.has("hireLevel");

  if (!hasFilters) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        const params = new URLSearchParams(searchParams);
        params.delete("hireLevel");
        router.push(`?${params.toString()}`);
      }}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

export default ClearPositionFiltersButton;

