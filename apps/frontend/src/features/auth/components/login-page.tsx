import { useSearch } from "@tanstack/react-router";
import EmailSignInForm from "#/features/auth/components/email-signin-form";
import GoogleSignInButton from "#/features/auth/components/google-signin-button";
import { Separator } from "#/components/ui/separator";

export function LoginPage() {
  const { redirect: callbackURL } = useSearch({ from: "/_auth/login" });

  return (
    <>
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to DAC Recruiting
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage candidates, interviews, applications, and hiring workflows in
          one place.
        </p>
      </div>

      <EmailSignInForm callbackURL={callbackURL} />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton callbackURL={callbackURL} />

      <p className="text-center text-xs text-muted-foreground">
        Use your @darkalphacapital.com work email with email/password or Google.
        Access is limited to Dark Alpha Capital team members.
      </p>
    </>
  );
}
