import { createFileRoute } from "@tanstack/react-router";
import { UserProfilePage } from "#/features/auth/components/user-profile-page";

export const Route = createFileRoute("/_main/profile/$userId")({
  head: () => ({
    meta: [{ title: "Profile" }],
  }),
  component: UserProfilePage,
});
