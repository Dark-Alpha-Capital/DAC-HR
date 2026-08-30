import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { EmailTemplatesPage } from "#/features/email-templates/components/email-templates-page";

export const Route = createFileRoute("/_main/admin/email-templates")({
  head: () => ({
    meta: [{ title: "Email Templates" }],
  }),
  pendingComponent: () => <ListPageSkeleton rowCount={4} showActions={false} />,
  component: EmailTemplatesPage,
});
