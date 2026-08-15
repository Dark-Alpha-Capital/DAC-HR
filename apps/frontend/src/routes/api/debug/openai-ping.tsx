import { createFileRoute } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";
import { describeOpenAIKeySources } from "#/lib/server/openai-api-key";
import { pingOpenAIRealtime } from "#/lib/server/openai-ping";

export const Route = createFileRoute("/api/debug/openai-ping")({
  server: {
    handlers: {
      GET: async () => {
        const isDev = import.meta.env.DEV;
        if (!isDev) {
          const session = await getSession();
          if (!session?.user || session.user.role !== "admin") {
            return Response.json({ error: "Not found" }, { status: 404 });
          }
        }

        try {
          const result = await pingOpenAIRealtime();
          return Response.json({
            environment: isDev ? "development" : "production",
            ...result,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "OpenAI ping failed";
          return Response.json(
            {
              environment: isDev ? "development" : "production",
              error: message,
              keySources: describeOpenAIKeySources(),
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
