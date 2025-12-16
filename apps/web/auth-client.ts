import { createAuthClient } from "better-auth/react";
import { adminClient, customSessionClient } from "better-auth/client/plugins";
import type { auth } from "@/auth";
import { bearer } from "better-auth/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_BASEURL,
  plugins: [adminClient(), customSessionClient<typeof auth>(), bearer()],
});

export const signInWithGoogle = async () => {
  const response = await authClient.signIn.social({
    provider: "google",
  });
  if (response.error) {
    console.error(response.error);
  }
  return response.data;
};
