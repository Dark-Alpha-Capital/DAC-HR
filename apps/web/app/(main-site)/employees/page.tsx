import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getEmployees, getPositions } from "@workspace/db/queries";
import FilterEmployeePosition from "@/components/filter-employee-position";
import FilterEmployeeDepartment from "@/components/filter-employee-department";
import ClearEmployeeFiltersButton from "@/components/clear-employee-filters-button";
import EmployeeContainer from "./employee-container";
import { EmployeesListSkeleton } from "@/components/skeletons/employees-list-skeleton";
import { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";

export const metadata: Metadata = {
  title: "Employees",
  description: "Employees list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Employees</h1>
        <Button asChild>
          <Link
            href={{
              pathname: "/employees/new",
            }}
          >
            New Employee
          </Link>
        </Button>
      </div>

      <Suspense>
        <PresentFilters />
      </Suspense>

      <Suspense fallback={<EmployeesListSkeleton />}>
        <EmployeesListWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

async function CachedPresentFilters() {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");

  const positions = await getPositions();
  const positionTypes = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterEmployeePosition positions={positionTypes} />
      <FilterEmployeeDepartment />
      <ClearEmployeeFiltersButton />
    </div>
  );
}

const PresentFilters = CachedPresentFilters;

// Component (not cached) reads runtime data
const EmployeesListWrapper = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const { position, department } = await searchParams;

  // Extract position IDs from the position parameter
  const positionIds = position
    ? Array.isArray(position)
      ? position
      : [position]
    : undefined;

  // Extract departments from the department parameter
  const departments = department
    ? Array.isArray(department)
      ? department
      : [department]
    : undefined;

  return (
    <CachedEmployeesList positionIds={positionIds} departments={departments} />
  );
};

// Cached component receives data as props
async function CachedEmployeesList({
  positionIds,
  departments,
}: {
  positionIds?: string[];
  departments?: string[];
}) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("employees");

  const employees = await getEmployees(positionIds, departments);

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {positionIds || departments
            ? "No employees found matching the selected filters."
            : "No employees found."}
        </p>
        <Button asChild className="mt-4">
          <Link
            href={{
              pathname: "/employees/new",
            }}
          >
            Add your first employee
          </Link>
        </Button>
      </div>
    );
  }

  return <EmployeeContainer employees={employees} />;
}
