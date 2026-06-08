import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/profile/$userId")({
  head: () => ({
    meta: [{ title: "Profile" }],
  }),
  component: UserProfilePage,
});

function UserProfilePage() {
  return <div>UserProfilePage</div>;
}
