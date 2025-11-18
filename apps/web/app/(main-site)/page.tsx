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

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to DAC HR</h1>
          <p className="text-muted-foreground">
            Sign in to access your HR automation platform
          </p>
        </div>
        <div className="flex flex-col space-y-4">
          <GoogleSignInButton />
        </div>
        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="mx-3 text-xs text-muted-foreground uppercase">
            or
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Don't have an account?{" "}
          <a href="/signup" className="text-primary underline hover:opacity-80">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
