import type { AgentConfig } from "@workspace/db/enums";
import type { InterviewQuestion } from "./types";

function formatQuestion(question: InterviewQuestion, index: number): string {
  const prefix = `Question ${index + 1}`;
  if (question.questionType === "mcq" && question.options?.length) {
    const options = question.options
      .map((option, optionIndex) => {
        const label = String.fromCharCode(65 + optionIndex);
        return `Option ${label}: ${option.text}`;
      })
      .join("; ");
    return `${prefix} (MCQ): ${question.questionText}. ${options}`;
  }

  return `${prefix}: ${question.questionText}`;
}

export function buildRealtimeInstructions(options: {
  roundName?: string;
  positionName?: string;
  candidateName?: string;
  questions: InterviewQuestion[];
  agentConfig?: AgentConfig;
}): string {
  const questionBlock = options.questions
    .map((question, index) => formatQuestion(question, index))
    .join("\n");

  const customInstructions = options.agentConfig?.instructions?.trim();

  return [
    "You are conducting a structured job interview for Dark Alpha Capital.",
    options.positionName
      ? `Position: ${options.positionName}.`
      : "Position: not specified.",
    options.roundName ? `Round: ${options.roundName}.` : "",
    options.candidateName
      ? `Candidate: ${options.candidateName}.`
      : "Candidate name is available in the session.",
    "",
    "Rules:",
    "- Ask one question at a time in order.",
    "- For MCQ questions, read all options clearly (A, B, C, D).",
    "- Acknowledge the candidate's answer briefly before moving on.",
    "- Do not reveal correct answers or coach the candidate.",
    "- Keep a professional, concise tone.",
    "- Remind the candidate to stay in fullscreen and focus on the interview window.",
    customInstructions ? `Additional instructions: ${customInstructions}` : "",
    "",
    "Questions:",
    questionBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSessionUpdateEvent(instructions: string) {
  return {
    type: "session.update",
    session: {
      instructions,
      modalities: ["text", "audio"],
      input_audio_transcription: { model: "whisper-1" },
      turn_detection: { type: "server_vad" },
    },
  };
}

export function buildAskCurrentQuestionEvent(questionText: string) {
  return {
    type: "response.create",
    response: {
      modalities: ["text", "audio"],
      instructions: `Ask this question now: ${questionText}`,
    },
  };
}
