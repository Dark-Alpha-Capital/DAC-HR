import { HelpCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { AddRoundQuestionDialog } from "~/components/dialogs/add-round-question-dialog";
import {
  PositionRoundQuestionItem,
  type RoundSheetQuestion,
} from "~/components/position-round-question-item";

interface RoundQuestionsSectionProps {
  roundId: string;
  roundName: string;
  positionId: string;
  positionName: string;
  questions: RoundSheetQuestion[];
  onChanged: () => void;
  variant?: "page" | "compact";
}

export function RoundQuestionsSection({
  roundId,
  roundName,
  positionId,
  positionName,
  questions,
  onChanged,
  variant = "page",
}: RoundQuestionsSectionProps) {
  const isPage = variant === "page";
  const canManageQuestions = Boolean(roundId && positionId);

  return (
    <section className={isPage ? "space-y-6" : "space-y-5"}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <HelpCircle
            className={
              isPage
                ? "h-5 w-5"
                : "h-4 w-4 text-muted-foreground"
            }
          />
          <h2
            className={
              isPage
                ? "text-lg font-semibold"
                : "text-sm font-semibold"
            }
          >
            Questions
          </h2>
          <Badge variant="secondary">{questions.length}</Badge>
        </div>
        {canManageQuestions ? (
          <AddRoundQuestionDialog
            positionId={positionId}
            positionName={positionName}
            roundId={roundId}
            roundName={roundName}
            onQuestionAdded={onChanged}
          />
        ) : null}
      </div>

      {questions.length === 0 ? (
        <div
          className={
            isPage
              ? "rounded-lg border border-dashed px-6 py-12 text-center"
              : "rounded-lg border border-dashed px-6 py-12 text-center"
          }
        >
          <HelpCircle
            className={
              isPage
                ? "mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50"
                : "mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-50"
            }
          />
          <p
            className={
              isPage
                ? "mb-4 text-muted-foreground"
                : "mb-5 text-sm text-muted-foreground"
            }
          >
            No questions in this round yet.
          </p>
          {canManageQuestions ? (
            <AddRoundQuestionDialog
              positionId={positionId}
              positionName={positionName}
              roundId={roundId}
              roundName={roundName}
              onQuestionAdded={onChanged}
              variant="empty-state"
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <PositionRoundQuestionItem
              key={question.id}
              question={question}
              index={index}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export type { RoundSheetQuestion };
