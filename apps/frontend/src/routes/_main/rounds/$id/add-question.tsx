import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/rounds/$id/add-question")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/rounds/$id",
      params: { id: params.id },
    });
  },
});
