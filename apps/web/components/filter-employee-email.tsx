import { useUrlSearchParams } from "@/lib/hooks/use-url-search-params";

import React, { useTransition, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

const FilterEmployeeEmail = () => {
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
          params.set("email", value.trim());
        } else {
          params.delete("email");
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
      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="email"
        placeholder="Search by email..."
        defaultValue={searchParams.get("email") || ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};

export default FilterEmployeeEmail;
