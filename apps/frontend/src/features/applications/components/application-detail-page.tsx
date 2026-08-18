import { useParams } from "@tanstack/react-router";
import { ApplicationDetailView } from "#/features/applications/components/application-detail-view";

export function ApplicationDetailPage() {
  const { id } = useParams({ from: "/_main/applications/$id/" });
  return <ApplicationDetailView applicationId={id} layout="page" />;
}
