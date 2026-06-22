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
    "- Start with a brief welcome and ask if the candidate is ready before the first question.",
    "- Ask one question at a time in order.",
    "- For MCQ questions, read all options clearly (A, B, C, D).",
    "- Acknowledge the candidate's answer briefly before moving on.",
    "- After the final question, thank the candidate and tell them to click the End Interview button on screen to finish.",
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

export function buildSessionUpdateEvent(instructions: string, voice?: string) {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      instructions,
      output_modalities: ["audio"],
      audio: {
        input: {
          transcription: { model: "whisper-1" },
          turn_detection: { type: "server_vad" },
        },
        ...(voice ? { output: { voice } } : {}),
      },
    },
  };
}

export function buildWelcomeIntroEvent(options: {
  candidateName?: string;
  positionName?: string;
  roundName?: string;
}) {
  const name = options.candidateName ?? "there";
  const position = options.positionName ?? "this role";
  const round = options.roundName ? ` for the ${options.roundName} round` : "";

  return {
    type: "response.create",
    response: {
      instructions: [
        `Greet ${name} warmly and welcome them to their Dark Alpha Capital interview for the ${position} position${round}.`,
        "Briefly explain that you will ask interview questions one at a time and they should answer out loud when prompted.",
        "Ask if they are ready to begin. Keep it concise and professional (under 30 seconds).",
        "Do not ask any interview questions yet.",
      ].join(" "),
    },
  };
}

export function buildAskCurrentQuestionEvent(questionText: string) {
  return {
    type: "response.create",
    response: {
      instructions: `Ask this question now, reading it clearly: ${questionText}`,
    },
  };
}

export function buildClosingEvent() {
  return {
    type: "response.create",
    response: {
      instructions: [
        "All interview questions have been completed.",
        "Thank the candidate sincerely for their time and answers.",
        'Clearly say: "Please click the End Interview button on your screen to complete your session."',
        "Do not ask any more questions.",
      ].join(" "),
    },
  };
}
