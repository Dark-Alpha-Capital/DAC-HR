import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AuthProvider } from "./auth-provider";
import { PointerEventsGuard } from "./pointer-events-guard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      {/* <PointerEventsGuard /> */}
      <AuthProvider>{children}</AuthProvider>
    </NextThemesProvider>
  );
}
