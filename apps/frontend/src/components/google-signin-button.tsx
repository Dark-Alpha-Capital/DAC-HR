import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type Props = {
  callbackURL?: string;
  className?: string;
};

export default function GoogleSignInButton({
  className,
  callbackURL = "/dashboard",
}: Props) {
  const href = `/api/login/google?${new URLSearchParams({ callbackURL })}`;

  return (
    <Button asChild className={cn("w-full", className)}>
      <a href={href}>Sign in with Google</a>
    </Button>
  );
}
