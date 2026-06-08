import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MainLayout } from "@/components/main-layout";

export const Route = createFileRoute("/_main")({
  component: MainSiteLayout,
});

function MainSiteLayout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
