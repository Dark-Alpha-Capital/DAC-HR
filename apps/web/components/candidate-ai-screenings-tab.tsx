import { getCandidateAiScreenings } from "@workspace/db/queries";
import CandidateAiScreeningsClient from "./candidate-ai-screenings-client";

interface CandidateAiScreeningsTabProps {
  candidateId: string;
  positionId: string | null;
}

export default async function CandidateAiScreeningsTab({
  candidateId,
  positionId,
}: CandidateAiScreeningsTabProps) {
  // No caching - fetch fresh data every time
  const screenings = await getCandidateAiScreenings(
    candidateId,
    positionId || undefined
  );

  return (
    <CandidateAiScreeningsClient
      screenings={screenings}
      positionId={positionId}
    />
  );
}
