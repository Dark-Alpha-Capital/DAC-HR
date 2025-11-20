import React, { Suspense } from "react";
import GoogleSignInButton from "@/components/google-signin-button";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  return (
    <div>
      <Suspense fallback={<div>Loading auth content...</div>}>
        <AuthContent />
      </Suspense>
    </div>
  );
};

export default page;

async function AuthContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    return redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center mb-2">
          Create your account
        </h1>
        <p className="text-muted-foreground text-center mb-6">
          Sign up to access your account, save progress, and enjoy more
          features.
        </p>
        <div className="flex flex-col space-y-4">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
