import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Forward to better-auth handler
        const res = await auth.handler(request);
        const url = new URL(request.url);
        const isCallback = url.pathname.includes("/callback/");
        if (isCallback && res.status >= 400 && res.status < 500) {
          return Response.redirect(new URL("/unauthorized", url.origin));
        }
        return res;
      },
      POST: async ({ request }) => {
        const res = await auth.handler(request);
        const url = new URL(request.url);
        const isCallback = url.pathname.includes("/callback/");
        if (isCallback && res.status >= 400 && res.status < 500) {
          return Response.redirect(new URL("/unauthorized", url.origin));
        }
        return res;
      },
    },
  },
});
