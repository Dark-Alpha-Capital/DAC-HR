import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/login/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const callbackURL = url.searchParams.get("callbackURL") ?? "/dashboard";

        const res = await auth.api.signInSocial({
          body: { provider: "google", callbackURL },
          headers: request.headers,
          asResponse: true,
        });

        // SAFETY: better-auth's signInSocial response carries `url` in the body
        // when a redirect is required (the OAuth authorize URL).
        const data = (await res.json()) as { url?: string };

        if (!data.url) {
          return Response.redirect(new URL("/unauthorized", url.origin));
        }

        const headers = new Headers({ Location: data.url });
        for (const cookie of res.headers.getSetCookie()) {
          headers.append("Set-Cookie", cookie);
        }

        return new Response(null, { status: 302, headers });
      },
    },
  },
});
