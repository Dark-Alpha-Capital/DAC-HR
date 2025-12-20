import { getCandidateAiScreenings } from "@workspace/db/queries";
import CandidateAiScreeningsClient from "./candidate-ai-screenings-client";
import { cacheLife, cacheTag } from "next/cache";

interface CandidateAiScreeningsTabProps {
  candidateId: string;
  positionId: string | null;
}

export default async function CandidateAiScreeningsTab({
  candidateId,
  positionId,
}: CandidateAiScreeningsTabProps) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`candidate-ai-screenings-${candidateId}`);

  // Fetch all screenings for the candidate, not filtered by position
  // This matches the behavior of ScreeningsCount component
  const screenings = await getCandidateAiScreenings(candidateId);

  return (
    <CandidateAiScreeningsClient
      screenings={screenings}
      positionId={positionId}
    />
  );
}
