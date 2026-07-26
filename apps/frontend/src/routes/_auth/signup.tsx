import {
  createFileRoute,
  redirect,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { fetchSession } from "~/lib/auth-session";
import EmailSignUpForm from "~/components/email-signup-form";

export const Route = createFileRoute("/_auth/signup")({
  head: () => ({
    meta: [{ title: "Sign Up - DAC-HR" }],
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
  component: SignUpPage,
});

function SignUpPage() {
  const { redirect: callbackURL } = Route.useSearch();

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
