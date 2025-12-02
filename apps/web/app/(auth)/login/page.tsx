import React, { Suspense } from "react";
import GoogleSignInButton from "@/components/google-signin-button";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - DAC-HR",
  description: "Login to your account to continue",
};

const page = async () => {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<AuthLoadingSkeleton />}>
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
    <div className="min-h-screen flex">
      {/* Left Side - Image Placeholder */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="w-full h-full bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
            <div className="text-center space-y-4 p-8">
              <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-primary/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">
                Login Image Placeholder
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold">LOGIN TO DAC-HR</h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
            <GoogleSignInButton />
          </div>

          <div className="space-y-6">
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-primary hover:underline"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-muted/30 animate-pulse" />
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-muted animate-pulse rounded" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
