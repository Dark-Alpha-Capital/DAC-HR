import React from "react";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/sidebars/app-sidebar";
import { MainSiteTopbar } from "~/components/main-site/topbar";
import type { AppSession } from "~/lib/auth-session";

export function MainLayout({ session, children }: { session: AppSession; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <div
          id="main-content"
          className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
