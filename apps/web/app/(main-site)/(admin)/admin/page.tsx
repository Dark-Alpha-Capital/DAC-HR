import { auth } from "@/auth";
import { headers } from "next/headers";
import React, { Suspense } from "react";
import { redirect } from "next/navigation";

const page = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <AdminContent />
      </Suspense>
    </div>
  );
};

export default page;

async function AdminContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div>
      <h1>Admin</h1>
    </div>
  );
}
