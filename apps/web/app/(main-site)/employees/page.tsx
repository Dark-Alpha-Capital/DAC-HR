import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getEmployees, getPositions } from "@workspace/db/queries";
import EmployeeCard from "@/components/employee-card";
import FilterEmployeePosition from "@/components/filter-employee-position";
import FilterEmployeeDepartment from "@/components/filter-employee-department";
import ClearEmployeeFiltersButton from "@/components/clear-employee-filters-button";
import { Metadata } from "next";

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

      <Suspense fallback={<div>Loading...</div>}>
        <EmployeesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

const PresentFilters = async () => {
  const positions = await getPositions();
  const positionTypes = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return (
    <div className="flex items-center gap-2">
      <FilterEmployeePosition positions={positionTypes} />
      <FilterEmployeeDepartment />
      <ClearEmployeeFiltersButton />
    </div>
  );
};

const EmployeesList = async ({
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {employees.map((employee) => (
        <EmployeeCard key={employee.id} employee={employee} />
      ))}
    </div>
  );
};
