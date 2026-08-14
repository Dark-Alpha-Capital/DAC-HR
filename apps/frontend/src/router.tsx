import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { PageLoadingFallback } from "#/components/shared/page-loading-fallback";
import { getQueryClient } from "#/lib/query/query-client";

export type RouterContext = {
  queryClient: QueryClient;
};

export function getRouter() {
  const queryClient = getQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingMs: 150,
    defaultPendingMinMs: 150,
    defaultPendingComponent: () => <PageLoadingFallback />,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
