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
