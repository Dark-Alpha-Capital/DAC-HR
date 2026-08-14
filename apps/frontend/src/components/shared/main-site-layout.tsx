import { Outlet } from "@tanstack/react-router";
import { MainLayout } from "#/components/shared/main-layout";
import { Providers } from "#/components/shared/providers";
import { Toaster } from "#/components/ui/sonner";
import type { AppSession } from "#/lib/auth-session";

export function MainSiteLayout({ session }: { session: AppSession }) {
  return (
    <Providers>
      <MainLayout session={session}>
        <Outlet />
      </MainLayout>

      <Toaster />
    </Providers>
  );
}
