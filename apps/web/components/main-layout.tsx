import { Suspense } from "react";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { AppSidebar } from "@/components/sidebars/app-sidebar";
import { MainSiteTopbar } from "@/components/main-site/topbar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
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
