/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { Providers } from "@/components/providers";
import { Toaster } from "@workspace/ui/components/sonner";
import appCss from "@workspace/ui/globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: NotFound,
  component: RootLayout,
});

function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">404 — Not Found</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
    </div>
  );
}

function RootLayout() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased min-h-svh bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-foreground focus:shadow-md"
        >
          Skip to main content
        </a>
        <Providers>
          <Outlet />
          <Toaster />
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}
