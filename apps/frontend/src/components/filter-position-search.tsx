import { useUrlSearchParams } from "~/lib/hooks/use-url-search-params";
import { resetListPageParam } from "~/lib/parse-search";
import { useTransition, useEffect, useRef } from "react";
import { Input } from "~/components/ui/input";
import { Search } from "lucide-react";

const FilterPositionSearch = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        resetListPageParam(params);
        if (value.trim()) {
          params.set("search", value.trim());
        } else {
          params.delete("search");
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
      className="relative min-w-[200px] flex-1 max-w-sm"
      data-pending={isPending ? "" : undefined}
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        key={`position-search-${searchParams.get("search") ?? ""}`}
        type="text"
        placeholder="Search positions..."
        defaultValue={searchParams.get("search") || ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};

export default FilterPositionSearch;
