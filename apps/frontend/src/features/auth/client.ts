import { createAuthClient } from "better-auth/react";
import { adminClient, customSessionClient } from "better-auth/client/plugins";
import type { auth } from "#/lib/auth";

export const authClient = createAuthClient({
  baseURL:
    (globalThis.location?.origin ?? process.env.BETTER_AUTH_URL) ||
    "http://localhost:3000",
  plugins: [adminClient(), customSessionClient<typeof auth>()],
});
