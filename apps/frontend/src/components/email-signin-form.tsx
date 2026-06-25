import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "~/auth-client";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  isAllowedEmail,
  UNAUTHORIZED_DOMAIN_MESSAGE,
} from "~/lib/auth-domain";
import { cn } from "~/lib/utils";

type Props = {
  callbackURL?: string;
  className?: string;
};

export default function EmailSignInForm({
  className,
  callbackURL = "/dashboard",
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDomainError(null);

    if (!isAllowedEmail(email)) {
      setDomainError(UNAUTHORIZED_DOMAIN_MESSAGE);
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Sign in failed");
        setPending(false);
        return;
      }

      window.location.assign(callbackURL);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <FieldGroup>
        <Field data-invalid={!!domainError}>
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@darkalphacapital.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (domainError) setDomainError(null);
            }}
            aria-invalid={!!domainError}
            required
          />
          {domainError ? <FieldError>{domainError}</FieldError> : null}
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in with email"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account yet?{" "}
        <Link
          to="/signup"
          search={{ redirect: callbackURL }}
          className="text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
