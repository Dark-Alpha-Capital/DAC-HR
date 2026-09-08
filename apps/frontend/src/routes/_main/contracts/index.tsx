import { createFileRoute } from "@tanstack/react-router";
import { ContractsPage } from "#/features/contracts/components/contracts-page";

type ContractsSearch = { tab?: "send" | "templates" };

interface ContractsSearchInput {
  tab?: unknown;
}

function parseContractsSearch(search: ContractsSearchInput): ContractsSearch {
  const tab = search.tab;
  if (tab === "send" || tab === "templates") {
    return { tab };
  }
  return {};
}

export const Route = createFileRoute("/_main/contracts/")({
  head: () => ({
    meta: [{ title: "Contracts - DAC HR" }],
  }),
  validateSearch: parseContractsSearch,
  component: ContractsRoute,
});

function ContractsRoute() {
  const { tab } = Route.useSearch();
  return <ContractsPage initialTab={tab ?? "send"} />;
}
