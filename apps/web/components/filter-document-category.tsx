"use client";

import React, {
  useOptimistic,
  useTransition,
  useEffect,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import { Filter, Loader2 } from "lucide-react";
import { getAllCategories } from "@/lib/actions/document-category-actions";
import type { DocumentCategory } from "@workspace/db/schema";

const FilterDocumentCategory = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategories, setSelectedCategories] = useOptimistic(
    searchParams.getAll("category"),
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await getAllCategories();
        if (result.success && result.data) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("category");

      const newSelected = checked
        ? [...selectedCategories, value]
        : selectedCategories.filter((cat) => cat !== value);

      newSelected.forEach((cat) => params.append("category", cat));
      setSelectedCategories(newSelected);

      router.push(`?${params.toString()}`, {
        scroll: false,
      });
    });
  };

  return (
    <div
      className="flex items-center gap-2"
      data-pending={isPending ? "" : undefined}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Category
            {selectedCategories.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedCategories.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {loadingCategories ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No categories available
            </div>
          ) : (
            categories.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat.id}
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={(checked) =>
                  handleCheckedChange(cat.id, checked as boolean)
                }
              >
                {cat.name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterDocumentCategory;
