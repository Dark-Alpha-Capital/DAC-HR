import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import GoogleSignInButton from "@/components/google-signin-button";
import React from "react";

export const metadata: Metadata = {
  title: "DAC HR",
  description: "HR Automation Platform",
};

export default async function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserContent />
    </Suspense>
  );
}

async function UserContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  console.log("session", session);

  if (!session) {
    redirect("/login");
  }

  return <div>User Content</div>;
}
