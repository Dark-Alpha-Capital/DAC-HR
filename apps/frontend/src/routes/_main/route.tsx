import { createFileRoute, redirect } from "@tanstack/react-router";
import { MainLayoutSkeleton } from "#/components/shared/main-layout-skeleton";
import { MainSiteLayout } from "#/components/shared/main-site-layout";
import { fetchSession } from "#/lib/auth-session";

export const Route = createFileRoute("/_main")({
  beforeLoad: async () => {
    const session = await fetchSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return { session };
  },
  pendingComponent: () => <MainLayoutSkeleton />,
  component: () => {
    const { session } = Route.useRouteContext();
    return <MainSiteLayout session={session} />;
  },
});
