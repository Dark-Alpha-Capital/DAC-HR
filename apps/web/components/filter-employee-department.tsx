"use client";

import React, { useOptimistic, useTransition } from "react";
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
import { Filter } from "lucide-react";

const departments = [
  { value: "engineering", label: "Engineering" },
  { value: "product", label: "Product" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "hr", label: "HR" },
  { value: "finance", label: "Finance" },
  { value: "operations", label: "Operations" },
  { value: "legal", label: "Legal" },
  { value: "customer-support", label: "Customer Support" },
  { value: "other", label: "Other" },
];

const FilterEmployeeDepartment = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDepartments, setSelectedDepartments] = useOptimistic(
    searchParams.getAll("department")
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("department");

      const newSelected = checked
        ? [...selectedDepartments, value]
        : selectedDepartments.filter((dept) => dept !== value);

      newSelected.forEach((dept) => params.append("department", dept));
      setSelectedDepartments(newSelected);

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
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Department
            {selectedDepartments.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedDepartments.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Department</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {departments.map((dept) => (
            <DropdownMenuCheckboxItem
              key={dept.value}
              checked={selectedDepartments.includes(dept.value)}
              onCheckedChange={(checked) =>
                handleCheckedChange(dept.value, checked as boolean)
              }
            >
              {dept.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterEmployeeDepartment;

