"use client";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { authClient } from "@/auth-client";

import * as React from "react";

type Props = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  callbackURL?: string;
};

export default function GoogleSignInButton({
  className,
  callbackURL = "/",
  children,
  ...props
}: Props) {
  const [isLoading, startTransition] = React.useTransition();

  return (
    <Button
      {...props}
      type="button"
      variant={props.variant ?? "outline"}
      size={props.size ?? "lg"}
      disabled={props.disabled ?? isLoading}
      className={cn("w-full", className)}
      onClick={() => {
        startTransition(async () => {
          const response = await authClient.signIn.social({
            provider: "google",
            callbackURL,
          });

          if (response.error) {
            console.error("Sign in error:", response.error);
          }
        });
      }}
    >
      {isLoading ? (
        <>
          <Spinner />
          <span>Continuing…</span>
        </>
      ) : children ? (
        children
      ) : (
        <>
          <GoogleIcon />
          <span>Continue with Google</span>
        </>
      )}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-4">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.662 32.655 29.234 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.88 19.51C14.655 15.108 18.958 12 24 12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.213 0-9.626-3.327-11.293-7.946l-6.53 5.03C9.487 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.06 12.06 0 0 1-4.086 5.57h.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}
