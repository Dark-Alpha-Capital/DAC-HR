import { createFileRoute } from "@tanstack/react-router";
import { contractsService } from "#/features/contracts/server/contracts-service";

export const Route = createFileRoute("/api/contract/$token/")({
  server: {
    handlers: {
      // Public, token-scoped. Returns the candidate-facing contract payload
      // (never candidate email/phone or internal notes).
      GET: async ({ params }) => {
        try {
          const { token } = params;
          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const data = await contractsService.getPublicByToken(token);

          if (!data) {
            return Response.json(
              { error: "Contract not found" },
              { status: 404 },
            );
          }

          return Response.json(data);
        } catch (error) {
          console.error("contract review load failed:", error);
          return Response.json(
            { error: "Failed to load contract" },
            { status: 500 },
          );
        }
      },
    },
  },
});
