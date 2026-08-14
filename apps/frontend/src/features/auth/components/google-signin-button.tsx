import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { authClient } from "#/features/auth/client";
import { cn } from "#/lib/utils";

type Props = {
  callbackURL?: string;
  className?: string;
};

export default function GoogleSignInButton({
  className,
  callbackURL = "/dashboard",
}: Props) {
  const [pending, setPending] = useState(false);

  const handleSignIn = async () => {
    setPending(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        setPending(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Google sign-in failed",
      );
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      className={cn("w-full", className)}
      disabled={pending}
      onClick={handleSignIn}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting to Google...
        </>
      ) : (
        "Sign in with Google"
      )}
    </Button>
  );
}
