import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MainLayout } from "@/components/main-layout";
import { fetchSession } from "@/lib/auth-session";

export const Route = createFileRoute("/_main")({
  beforeLoad: async () => {
    const session = await fetchSession();
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
