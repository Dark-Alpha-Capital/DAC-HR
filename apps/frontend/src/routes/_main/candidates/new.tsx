import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { CandidateNewPage } from "#/features/candidates/components/candidate-new-page";
import { loadCandidatesNew } from "#/features/candidates/server/queries/candidates";
import { toOptionalString } from "#/lib/parse-search";

export const Route = createFileRoute("/_main/candidates/new")({
  head: () => ({
    meta: [{ title: "New Candidate" }],
  }),
  validateSearch: (search: { position?: unknown }) => ({
    position: toOptionalString(search.position),
  }),
  loader: async () => loadCandidatesNew(),
  component: CandidateNewPage,
  pendingComponent: () => <FormPageSkeleton />,
});
