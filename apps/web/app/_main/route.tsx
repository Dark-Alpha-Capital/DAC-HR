import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { MainLayout } from "@/components/main-layout";
import { fetchSession } from "@/lib/auth-session";

export const Route = createFileRoute("/_main")({
  beforeLoad: async ({ location }) => {
    const session = await fetchSession();

    if (!session?.user) {
      throw redirect({
        to: "/login",
        search: {
          redirect: `${location.pathname}${location.search}`,
        },
      });
    }

    return { session };
  },
  component: MainSiteLayout,
});

function MainSiteLayout() {
  const { session } = Route.useRouteContext();

  return (
    <MainLayout session={session}>
      <Outlet />
    </MainLayout>
  );
}
