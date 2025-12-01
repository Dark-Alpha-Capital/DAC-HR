"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { authClient } from "@/auth-client";

const SigninGoogleButton = () => {
  return (
    <Button
      className="cursor-pointer"
      onClick={async () => {
        // signIn.social() will redirect to Google OAuth, then Better Auth will handle
        // the callback and redirect to callbackURL automatically
        const response = await authClient.signIn.social({
          provider: "google",
          callbackURL: "/",
        });
        if (response.error) {
          console.error("Sign in error:", response.error);
        }
        // No need to manually redirect - Better Auth handles the OAuth flow
      }}
    >
      Sign in with Google
    </Button>
  );
};

export default SigninGoogleButton;
