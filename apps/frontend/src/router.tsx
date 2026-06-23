import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { DetailPageSkeleton } from "~/components/route-skeletons/detail-page-skeleton";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPendingMs: 0,
    defaultPendingMinMs: 250,
    defaultPendingComponent: () => <DetailPageSkeleton />,
  });
}
