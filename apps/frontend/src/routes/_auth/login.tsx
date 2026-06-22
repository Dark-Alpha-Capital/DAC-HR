import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchSession } from "~/lib/auth-session";
import GoogleSignInButton from "~/components/google-signin-button";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [{ title: "Login - DAC-HR" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
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

      <GoogleSignInButton callbackURL={callbackURL} />

      <p className="text-center text-xs text-muted-foreground">
        Sign in with Google using your @darkalphacapital.com work email. Access
        is limited to Dark Alpha Capital team members.
      </p>
    </>
  );
}
