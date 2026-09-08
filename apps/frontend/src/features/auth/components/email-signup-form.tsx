import { useState } from "react";
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

const signUpSchema = z.object({
  name: z.string().min(1, "Enter your full name."),
  email: z
    .string()
    .min(1, "Enter your work email.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(1, "Enter a password.")
    .min(8, "Password must be at least 8 characters."),
});

type FieldErrors = { name?: string; email?: string; password?: string };

function firstMessage(result: z.ZodError, field: string): string | undefined {
  const issue = result.issues.find((i) => String(i.path[0]) === field);
  return issue?.message;
}

export default function EmailSignUpForm({
  className,
  callbackURL = "/dashboard",
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [domainError, setDomainError] = useState<string | null>(null);

  const clearFieldError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDomainError(null);

    const parsed = signUpSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setFieldErrors({
        name: firstMessage(parsed.error, "name"),
        email: firstMessage(parsed.error, "email"),
        password: firstMessage(parsed.error, "password"),
      });
      return;
    }

    if (!isAllowedEmail(email)) {
      setDomainError(UNAUTHORIZED_DOMAIN_MESSAGE);
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        callbackURL,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Sign up failed");
        setPending(false);
        return;
      }

      window.location.assign(callbackURL);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign up failed");
      setPending(false);
    }
  };

  const emailError = fieldErrors.email ?? domainError;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-4", className)}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={!!fieldErrors.name}>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (fieldErrors.name) clearFieldError("name");
            }}
            aria-invalid={!!fieldErrors.name}
            required
          />
          {fieldErrors.name ? (
            <FieldError>{fieldErrors.name}</FieldError>
          ) : null}
        </Field>

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
              if (fieldErrors.email) clearFieldError("email");
              if (domainError) setDomainError(null);
            }}
            aria-invalid={!!emailError}
            required
          />
          {emailError ? <FieldError>{emailError}</FieldError> : null}
        </Field>

        <Field data-invalid={!!fieldErrors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldErrors.password) clearFieldError("password");
            }}
            aria-invalid={!!fieldErrors.password}
            required
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters.
          </p>
          {fieldErrors.password ? (
            <FieldError>{fieldErrors.password}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          search={{ redirect: callbackURL }}
          className="text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
