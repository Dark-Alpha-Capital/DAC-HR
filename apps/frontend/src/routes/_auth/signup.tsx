import { createFileRoute, redirect, type SearchSchemaInput } from "@tanstack/react-router";
import { fetchSession } from "#/lib/auth-session";
import { SignUpPage } from "#/features/auth/components/signup-page";

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
