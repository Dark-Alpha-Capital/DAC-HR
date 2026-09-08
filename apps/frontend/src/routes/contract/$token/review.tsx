import { createFileRoute } from "@tanstack/react-router";
import { ContractReviewPage } from "#/features/contracts/components/contract-review-page";

export const Route = createFileRoute("/contract/$token/review")({
  head: () => ({
    meta: [{ title: "Contract Review - DAC" }],
  }),
  component: ContractRoute,
});

function ContractRoute() {
  const { token } = Route.useParams();
  return <ContractReviewPage token={token} />;
}
