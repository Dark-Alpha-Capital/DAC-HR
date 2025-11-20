import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import GoogleSignInButton from "@/components/google-signin-button";

export const metadata: Metadata = {
  title: "DAC HR - Login",
  description: "HR Automation Platform",
};

export default function Page() {
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

  if (session) {
    redirect("/dashboard");
  }

  return <div></div>;
}
