import React, { Suspense } from "react";
import { getTargetById } from "@workspace/db/queries";
import { notFound } from "next/navigation";
import EditTargetForm from "@/components/edit-target-form";
import { Metadata } from "next";
import { UserIsAdmin } from "@/components/auth-checks";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const target = await getTargetById(id);

  if (!target) {
    return {
      title: "Target Not Found - DAC HR",
      description: "The target you're looking for doesn't exist.",
    };
  }

  return {
    title: `Edit Target - DAC HR`,
    description: "Edit organizational target",
  };
}

async function EditTargetContent({ id }: { id: string }) {
  const target = await getTargetById(id);

  if (!target) {
    notFound();
  }

  return <EditTargetForm target={target} />;
}

export default async function EditTargetPage({ params }: { params: Params }) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <div>
        <h1 className="text-3xl font-bold">Edit Target</h1>
        <p className="text-muted-foreground mt-1">
          Update target details and status
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <EditTargetContent id={id} />
      </Suspense>
    </div>
  );
}
