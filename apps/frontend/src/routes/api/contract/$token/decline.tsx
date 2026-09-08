import { createFileRoute } from "@tanstack/react-router";
import { contractsService } from "#/features/contracts/server/contracts-service";

export const Route = createFileRoute("/api/contract/$token/decline")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const { token } = params;
          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const result = await contractsService.declineContract(token);

          if (!result.ok) {
            return Response.json({ error: result.error }, { status: 409 });
          }

          return Response.json({ ok: true });
        } catch (error) {
          console.error("decline contract failed:", error);
          return Response.json(
            { error: "Failed to decline the contract" },
            { status: 500 },
          );
        }
      },
    },
  },
});
