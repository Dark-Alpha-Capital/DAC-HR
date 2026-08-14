import { useSearch } from "@tanstack/react-router";
import EmailSignUpForm from "#/features/auth/components/email-signup-form";

export function SignUpPage() {
  const { redirect: callbackURL } = useSearch({ from: "/_auth/signup" });

  return (
    <>
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign up with your @darkalphacapital.com work email to access DAC
          Recruiting.
        </p>
      </div>

      <EmailSignUpForm callbackURL={callbackURL} />

      <p className="text-center text-xs text-muted-foreground">
        Access is limited to Dark Alpha Capital team members.
      </p>
    </>
  );
}
