import { useState, useTransition } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import * as z from "zod";
import { authClient } from "#/features/auth/client";
import { Button } from "#/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  isAllowedEmail,
  UNAUTHORIZED_DOMAIN_MESSAGE,
} from "#/features/auth/helpers";
import { cn } from "#/lib/utils";

type Props = {
  callbackURL?: string;
  className?: string;
};

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your work email.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type FieldErrors = { email?: string; password?: string };

function firstMessage(result: z.ZodError, field: string): string | undefined {
  const issue = result.issues.find((i) => String(i.path[0]) === field);
  return issue?.message;
}

export default function EmailSignInForm({
  className,
  callbackURL = "/dashboard",
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [domainError, setDomainError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDomainError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors({
        email: firstMessage(parsed.error, "email"),
        password: firstMessage(parsed.error, "password"),
      });
      return;
    }

    if (!isAllowedEmail(email)) {
      setDomainError(UNAUTHORIZED_DOMAIN_MESSAGE);
      return;
    }

    startTransition(async () => {
      try {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL,
        });

        if (result.error) {
          toast.error(result.error.message ?? "Sign in failed");
          return;
        }

        window.location.assign(callbackURL);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sign in failed");
      }
    });
  };

  const emailError = fieldErrors.email ?? domainError;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-4", className)}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={!!emailError}>
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
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
              if (domainError) setDomainError(null);
            }}
            aria-invalid={!!emailError}
            required
          />
          {emailError ? <FieldError>{emailError}</FieldError> : null}
        </Field>

        <Field data-invalid={!!fieldErrors.password}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            aria-invalid={!!fieldErrors.password}
            required
          />
          {fieldErrors.password ? (
            <FieldError>{fieldErrors.password}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in with email"}
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
