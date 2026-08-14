import { Badge } from "#/components/ui/badge";
import { EditRoundQuestionDialog } from "#/components/shared/edit-round-question-dialog";
import DeleteQuestionButton from "#/features/questions/components/delete-question-button";
import { getQuestionTypeLabel } from "#/features/questions/helpers";
import type { QuestionOption } from "@workspace/db/question-types";

export type RoundSheetQuestion = {
  id: string;
  questionText: string;
  questionType: string;
  options: QuestionOption[] | null;
};

interface PositionRoundQuestionItemProps {
  question: RoundSheetQuestion;
  index: number;
  onChanged: () => void;
}

export function PositionRoundQuestionItem({
  question,
  index,
  onChanged,
}: PositionRoundQuestionItemProps) {
  const isMcq = question.questionType === "mcq";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Question {index + 1}
          </p>
          <Badge variant="outline" className="text-xs">
            {getQuestionTypeLabel(question.questionType)}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <EditRoundQuestionDialog
            question={question}
            onQuestionUpdated={onChanged}
          />
          <DeleteQuestionButton
            questionId={question.id}
            onDeleted={onChanged}
          />
        </div>
      </div>
      <p className="text-sm leading-relaxed">{question.questionText}</p>
      {isMcq && question.options && question.options.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {question.options.map((option, optionIndex) => (
            <li
              key={option.id ?? `option-${optionIndex}`}
              className="text-sm text-muted-foreground"
            >
              <span className="mr-2 font-medium text-foreground">
                {optionIndex + 1}.
              </span>
              {option.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
