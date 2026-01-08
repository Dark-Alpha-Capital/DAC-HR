import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { Suspense } from "react";
import { UserAuthenticated } from "@/components/auth-checks";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Suspense>
        <UserAuthenticated />
      </Suspense>
      <DocsSidebar />
      <main className="flex-1 lg:pl-0">
        <div className="container max-w-4xl py-8 px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
