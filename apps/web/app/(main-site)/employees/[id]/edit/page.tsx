import EmployeeEditForm from "@/components/forms/employee-edit-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getEmployeeById, getPositions } from "@workspace/db/queries";
import BackButton from "@/components/back-button";

type Params = Promise<{ id: string }>;

const page = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />

      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayEmployeeEditForm params={params} />
      </Suspense>
    </div>
  );
};

export default page;

async function DisplayEmployeeEditForm({ params }: { params: Params }) {
  const { id } = await params;
  const [employee, positions] = await Promise.all([
    getEmployeeById(id),
    getPositions(),
  ]);

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Employee not found.</p>
        <Button asChild className="mt-4">
          <Link href="/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  const cleanedPositions = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return <EmployeeEditForm employee={employee} positions={cleanedPositions} />;
}

