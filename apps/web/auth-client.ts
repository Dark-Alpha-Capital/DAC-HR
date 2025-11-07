import { createAuthClient } from "better-auth/react";
import { adminClient, customSessionClient } from "better-auth/client/plugins";
import type { auth } from "@/auth";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: "http://localhost:3000",
  plugins: [adminClient(), customSessionClient<typeof auth>()],
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
