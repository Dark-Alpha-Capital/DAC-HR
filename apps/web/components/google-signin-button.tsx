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
  callbackURL = "/dashboard",
  children,
  ...props
}: Props) {
  const [isLoading, startTransition] = React.useTransition();

  const handleSignIn = async () => {
    console.log("[GoogleSignIn] Starting sign-in with Google", {
      callbackURL,
      baseURL: authClient.$fetch?.toString?.(),
    });
    startTransition(async () => {
      try {
        const response = await authClient.signIn.social({
          provider: "google",
          callbackURL,
        });
        console.log("[GoogleSignIn] Response received:", response);
        if (response.error) {
          console.error("[GoogleSignIn] Error:", response.error);
        } else {
          console.log("[GoogleSignIn] Success, redirecting...");
        }
      } catch (err) {
        console.error("[GoogleSignIn] Exception:", err);
      }
    });
  };

  return (
    <Button
      type="button"
      className={cn("w-full", className)}
      onClick={handleSignIn}
    >
      {isLoading ? (
        <>
          <Spinner />
          <span>Continuing...</span>
        </>
      ) : (
        <>Sign in with Google</>
      )}
    </Button>
  );
}
