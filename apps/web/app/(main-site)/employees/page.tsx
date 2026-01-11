import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getEmployees, getPositions } from "@workspace/db/queries";
import EmployeeFilters from "@/components/employee-filters";
import EmployeeContainer from "./employee-container";
import { EmployeesListSkeleton } from "@/components/skeletons/employees-list-skeleton";
import { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import PaginationControls from "@/components/pagination-controls";

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

  const { positions } = await getPositions();
  const positionTypes = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return <EmployeeFilters positions={positionTypes} />;
}

const PresentFilters = CachedPresentFilters;

// Component (not cached) reads runtime data
const EmployeesListWrapper = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const { position, department, name, email, page: pageParam } = await searchParams;

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

  // Extract page number (default to 1)
  const page = pageParam
    ? typeof pageParam === "string"
      ? parseInt(pageParam, 10)
      : Array.isArray(pageParam) && pageParam[0]
        ? parseInt(pageParam[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;

  return (
    <CachedEmployeesList
      positionIds={positionIds}
      departments={departments}
      name={typeof name === "string" ? name : undefined}
      email={typeof email === "string" ? email : undefined}
      currentPage={currentPage}
    />
  );
};

// Cached component receives data as props
async function CachedEmployeesList({
  positionIds,
  departments,
  name,
  email,
  currentPage,
}: {
  positionIds?: string[];
  departments?: string[];
  name?: string;
  email?: string;
  currentPage: number;
}) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("employees");

  const limit = 50;

  const { employees, total } = await getEmployees(
    positionIds,
    departments,
    name,
    email,
    currentPage,
    limit
  );

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {positionIds || departments || name || email
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

  return (
    <div className="space-y-6">
      <EmployeeContainer employees={employees as any} />
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          basePath="/employees"
        />
      )}
    </div>
  );
}
