import { Session } from "better-auth";
import CandidateAiAnalysis from "@/components/candidate-ai-analysis";
import { getCachedDocuments } from "@/lib/cache/candidate";

export async function AiAnalysisTab({
  candidateId,
  positionId,
  session,
}: {
  candidateId: string;
  positionId: string;
  session: Session;
}) {
  const documents = await getCachedDocuments(candidateId);

  return (
    <CandidateAiAnalysis
      candidateId={candidateId}
      positionId={positionId}
      session={session}
      documents={documents}
    />
  );
}
