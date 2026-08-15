import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { CandidateDetailPage } from "#/features/candidates/components/candidate-detail-page";
import { candidateDetailQueryOptions } from "#/features/candidates/query-options";

export const Route = createFileRoute("/_main/candidates/$uid/")({
  head: () => ({
    meta: [{ title: "Candidate Detail" }],
  }),
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData(candidateDetailQueryOptions(params.uid));
  },
  pendingComponent: () => <DetailPageSkeleton tabs tabCount={4} />,
  component: CandidateDetailPage,
});
