import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(
          {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
          },
          { status: 200 },
        );
      },
    },
  },
});
