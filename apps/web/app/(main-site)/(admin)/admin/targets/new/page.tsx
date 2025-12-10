import React, { Suspense } from "react";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import CreateTargetForm from "@/components/create-target-form";
import { Metadata } from "next";
import { UserIsAdmin } from "@/components/auth-checks";

export const metadata: Metadata = {
  title: "Create Target - Admin - DAC HR",
  description: "Create a new organizational target",
};

export default async function NewTargetPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <div>
        <h1 className="text-3xl font-bold">Create Target</h1>
        <p className="text-muted-foreground mt-1">
          Create a new organizational target or goal
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <CreateTargetForm userId={session.user.id} />
      </Suspense>
    </div>
  );
}
