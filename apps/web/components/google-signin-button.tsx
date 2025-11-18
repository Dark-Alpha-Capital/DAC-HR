"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { authClient, signInWithGoogle } from "@/auth-client";

const SigninGoogleButton = () => {
  const router = useRouter();

  return (
    <Button
      className="cursor-pointer"
      onClick={async () => {
        const response = await authClient.signIn.social({
          provider: "google",
          callbackURL: "/dashboard",
        });
        if (response.error) {
          console.error(response.error);
        } else {
          router.push("/dashboard");
        }
      }}
    >
      Sign in with Google
    </Button>
  );
};

export default SigninGoogleButton;
