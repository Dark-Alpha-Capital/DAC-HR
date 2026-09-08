import { createFileRoute } from "@tanstack/react-router";
import { NewContractTemplatePage } from "#/features/contracts/components/new-contract-template-page";

export const Route = createFileRoute("/_main/contracts/new")({
  head: () => ({
    meta: [{ title: "New Contract Template" }],
  }),
  component: NewContractTemplatePage,
});
