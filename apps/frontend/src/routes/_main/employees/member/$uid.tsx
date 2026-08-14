import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { PrismicMemberDetailPage } from "#/features/employees/components/prismic-member-detail-page";
import {
  parseMemberSearch,
  prismicMemberQueryOptions,
} from "#/features/docs/server/queries/members";

export const Route = createFileRoute("/_main/employees/member/$uid")({
  head: () => ({
    meta: [{ title: "Employee" }],
  }),
  validateSearch: parseMemberSearch,
  loader: async ({ context: { queryClient }, params, location }) => {
    const { kind } = parseMemberSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(
      prismicMemberQueryOptions(params.uid, kind),
    );
  },
  pendingComponent: () => <DetailPageSkeleton />,
  component: PrismicMemberDetailPage,
});
