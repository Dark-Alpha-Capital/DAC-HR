import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { MainLayout } from "~/components/main-layout";
import { Providers } from "~/components/providers";
import { Toaster } from "~/components/ui/sonner";
import { fetchSession } from "~/lib/auth-session";

export const Route = createFileRoute("/_main")({
  beforeLoad: async () => {
    const session = await fetchSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return { session };
  },
  component: MainSiteLayout,
});

function MainSiteLayout() {
  const { session } = Route.useRouteContext();

  return (
    <Providers>
      <MainLayout session={session}>
        <Outlet />
      </MainLayout>

      <Toaster />
    </Providers>
  );
}
