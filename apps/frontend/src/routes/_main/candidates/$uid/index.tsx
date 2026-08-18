import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { CandidateDetailPage } from "#/features/candidates/components/candidate-detail-page";
import { applicationDetailQueryOptions } from "#/features/applications/query-options";
import {
  candidateDetailQueryOptions,
  parseCandidateDetailSearch,
} from "#/features/candidates/query-options";

export const Route = createFileRoute("/_main/candidates/$uid/")({
  head: () => ({
    meta: [{ title: "Candidate Detail" }],
  }),
  validateSearch: parseCandidateDetailSearch,
  loader: async ({ context: { queryClient }, params, location }) => {
    const search = parseCandidateDetailSearch(location.search);
    await queryClient.ensureQueryData(candidateDetailQueryOptions(params.uid));
    if (search.applicationId) {
      await queryClient.ensureQueryData(
        applicationDetailQueryOptions(search.applicationId),
      );
    }
  },
  pendingComponent: () => <DetailPageSkeleton tabs tabCount={4} />,
  component: CandidateDetailPage,
});
