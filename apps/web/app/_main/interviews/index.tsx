import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/interviews/")({
  head: () => ({
    meta: [{ title: "Interviews" }],
  }),
  component: () => (
    <div className="p-6 text-center text-muted-foreground">
      No interview selected. Go to a candidate or application to view
      interviews.
    </div>
  ),
});
