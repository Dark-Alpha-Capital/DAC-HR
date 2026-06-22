import * as React from "react";
import { AuthProvider } from "./auth-provider";
import { TooltipProvider } from "~/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>{children}</AuthProvider>
    </TooltipProvider>
  );
}
