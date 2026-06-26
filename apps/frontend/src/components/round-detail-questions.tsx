import { useRouter } from "@tanstack/react-router";
import {
  RoundQuestionsSection,
  type RoundSheetQuestion,
} from "~/components/round-questions-section";

interface RoundDetailQuestionsProps {
  roundId: string;
  roundName: string;
  positionId: string;
  positionName: string;
  questions: RoundSheetQuestion[];
}

export function RoundDetailQuestions({
  roundId,
  roundName,
  positionId,
  positionName,
  questions,
}: RoundDetailQuestionsProps) {
  const router = useRouter();

  return (
    <RoundQuestionsSection
      roundId={roundId}
      roundName={roundName}
      positionId={positionId}
      positionName={positionName}
      questions={questions}
      onChanged={() => void router.invalidate()}
      variant="page"
    />
  );
}
