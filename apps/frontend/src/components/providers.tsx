import * as React from "react";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./auth-provider";
import { TooltipProvider } from "~/components/ui/tooltip";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((mod) => ({
    default: mod.ReactQueryDevtools,
  })),
);

function QueryDevtools() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} />
    </Suspense>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>{children}</AuthProvider>
      <QueryDevtools />
    </TooltipProvider>
  );
}
