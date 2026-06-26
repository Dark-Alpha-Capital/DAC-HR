import * as React from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "./auth-provider";
import { TooltipProvider } from "~/components/ui/tooltip";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((mod) => ({
    default: mod.ReactQueryDevtools,
  })),
);

function QueryDevtools() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!import.meta.env.DEV || !mounted) {
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
