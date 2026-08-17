import {
  createFileRoute,
  redirect,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { fetchSession } from "#/lib/auth-session";
import { LoginPage } from "#/features/auth/components/login-page";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [{ title: "Login - DAC-HR" }],
  }),
  validateSearch: (search: { redirect?: string } & SearchSchemaInput) => ({
    redirect:
      search.redirect && search.redirect.startsWith("/")
        ? search.redirect
        : "/dashboard",
  }),
  loader: async () => {
    const session = await fetchSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});
