import { createServerFn } from "@tanstack/react-start";
import { getRoundsByPositionId } from "@workspace/db/queries";

export const getRoundsByPosition = createServerFn({ method: "GET" })
  .validator((data: string) => data)
  .handler(async ({ data: positionId }) => {
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
