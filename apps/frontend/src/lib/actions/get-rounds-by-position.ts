import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { getRoundsByPositionId } from "@workspace/db/modules/positions";

export const getRoundsByPosition = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: positionId, context: { session } }) => {
  if (!positionId) {
    return [];
  }

  try {
    const rounds = await getRoundsByPositionId(positionId);
    return rounds.map((round) => ({
      id: round.id,
      name: round.name,
      description: round.description,
    }));
  } catch (error) {
    console.error("Error fetching rounds by position:", error);
    return [];
  }
});
