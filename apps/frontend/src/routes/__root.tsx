/// <reference types="vite/client" />
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import appCss from "#/styles/app.css?url";
import type { RouterContext } from "#/router";
import {
  ThemeProvider,
  THEME_STORAGE_KEY,
} from "#/components/shared/theme-provider";
import { NotFoundPage } from "#/components/shared/not-found";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [{ src: "/theme-init.js" }],
  }),
  notFoundComponent: NotFoundPage,
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <ThemeProvider defaultTheme="system" storageKey={THEME_STORAGE_KEY}>
          <Outlet />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
