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
  const screenings = await getCandidateAiScreenings(candidateId);

  return (
    <CandidateAiScreeningsClient
      screenings={screenings}
      positionId={positionId}
    />
  );
}
