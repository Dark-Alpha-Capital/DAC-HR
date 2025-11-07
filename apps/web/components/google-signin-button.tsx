"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { authClient, signInWithGoogle } from "@/auth-client";

const SigninGoogleButton = () => {
  return (
    <Button
      className="cursor-pointer"
      onClick={async () => {
        const response = await authClient.signIn.social({
          provider: "google",
        });
        if (response.error) {
          console.error(response.error);
        }
        console.log(response);
      }}
    >
      Sign in with Google
    </Button>
  );
};

export default SigninGoogleButton;
