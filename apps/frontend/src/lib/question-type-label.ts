import type { QuestionType } from "@workspace/db/enums";

export function getQuestionTypeLabel(questionType: QuestionType | string): string {
  switch (questionType) {
    case "text":
      return "Text";
    case "mcq":
      return "MCQ";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    default:
      return questionType;
  }
}
