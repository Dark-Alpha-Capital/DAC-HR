import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebars/app-sidebar";
import { MainSiteTopbar } from "@/components/main-site/topbar";
import type { AppSession } from "@/lib/auth-session";

export function MainLayout({
  children,
  session,
}: {
  children: React.ReactNode;
  session: AppSession;
}) {
  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <MainSiteTopbar />
        <div
          id="main-content"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8 overflow-x-hidden"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
