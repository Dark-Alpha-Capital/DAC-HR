import { Outlet } from "@tanstack/react-router";
import { DocsSidebar } from "#/features/docs/components/docs-sidebar";

export function DocsLayout() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar />
      <main className="flex-1 lg:pl-0">
        <div className="container max-w-4xl py-8 px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
