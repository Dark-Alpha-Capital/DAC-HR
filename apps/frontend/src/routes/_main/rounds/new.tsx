import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { RoundNewPage } from "#/features/rounds/components/round-new-page";
import { loadRoundsNew } from "#/features/rounds/server/queries/rounds";
import { toOptionalString } from "#/lib/parse-search";

export const Route = createFileRoute("/_main/rounds/new")({
  head: () => ({
    meta: [{ title: "New Round" }],
  }),
  validateSearch: (search: { position?: unknown }) => ({
    position: toOptionalString(search.position) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => loadRoundsNew({ data: deps }),
  component: RoundNewPage,
  pendingComponent: () => <FormPageSkeleton />,
});
