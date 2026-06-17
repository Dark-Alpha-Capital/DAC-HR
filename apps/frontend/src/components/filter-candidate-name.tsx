import { useUrlSearchParams } from "~/lib/hooks/use-url-search-params";

import React, { useTransition, useEffect, useRef } from "react";
import { Input } from "~/components/ui/input";
import { Search } from "lucide-react";

const FilterCandidateName = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (value.trim()) {
          params.set("name", value.trim());
        } else {
          params.delete("name");
        }
        setSearchParams(params);
    });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative flex-1 max-w-sm"
      data-pending={isPending ? "" : undefined}
    >
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search by name..."
        defaultValue={searchParams.get("name") || ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-9"
        aria-label="Filter candidates by name"
      />
    </div>
  );
};

export default FilterCandidateName;
