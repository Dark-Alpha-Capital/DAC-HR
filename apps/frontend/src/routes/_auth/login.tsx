import {
  createFileRoute,
  redirect,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { fetchSession } from "~/lib/auth-session";
import EmailSignInForm from "~/components/email-signin-form";
import GoogleSignInButton from "~/components/google-signin-button";
import { Separator } from "~/components/ui/separator";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [{ title: "Login - DAC-HR" }],
  }),
  validateSearch: (search: { redirect?: string } & SearchSchemaInput) => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/")
        ? search.redirect
        : "/dashboard",
  }),
  loader: async () => {
    const session = await fetchSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const { redirect: callbackURL } = Route.useSearch();

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
