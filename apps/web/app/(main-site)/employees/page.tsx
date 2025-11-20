import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getEmployees } from "@workspace/db/queries";
import EmployeeCard from "@/components/employee-card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employees",
  description: "Employees list",
};

const page = () => {
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

      <Suspense fallback={<div>Loading...</div>}>
        <EmployeesList />
      </Suspense>
    </div>
  );
};

export default page;

const EmployeesList = async () => {
  const employees = await getEmployees();

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No employees found.</p>
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
