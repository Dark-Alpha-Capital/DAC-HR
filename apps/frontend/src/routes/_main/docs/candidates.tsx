import { createFileRoute } from "@tanstack/react-router";
import { CandidatesDocsPage as CandidatesPage } from "#/features/docs/components/candidates-page";

export const Route = createFileRoute("/_main/docs/candidates")({
  head: () => ({
    meta: [{ title: "Candidates - DAC HR" }],
  }),
  component: CandidatesPage,
});
