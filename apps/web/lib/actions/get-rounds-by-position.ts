import { getRoundsByPositionId } from "@workspace/db/queries";

export const getRoundsByPosition = async (positionId: string) => {
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
};
