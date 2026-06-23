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
  const customInstructions = options.agentConfig?.instructions?.trim();
  const questionCount = options.questions.length;

  return [
    "You are conducting a structured job interview for Dark Alpha Capital.",
    options.positionName
      ? `Position: ${options.positionName}.`
      : "Position: not specified.",
    options.roundName ? `Round: ${options.roundName}.` : "",
    options.candidateName
      ? `Candidate: ${options.candidateName}.`
      : "Candidate name is available in the session.",
    `This interview has ${questionCount} questions total.`,
    questionCount > 0
      ? [
          "",
          "Questions (in order):",
          ...options.questions.map((question, index) =>
            formatQuestion(question, index),
          ),
        ].join("\n")
      : "",
    "",
    "Rules:",
    "- At the start of the interview, introduce yourself, welcome the candidate, and ask if they are ready before any questions.",
    "- Ask one question at a time, in order. Wait for the candidate to finish before the next.",
    "- For MCQ questions, read all options clearly (A, B, C, D).",
    "- Keep acknowledgments brief. Never say you are waiting for questions or instructions.",
    "- After the final question, thank the candidate and tell them to click the End Interview button on screen to finish.",
    "- Do not reveal correct answers or coach the candidate.",
    "- Keep a professional, concise tone.",
    customInstructions ? `Additional instructions: ${customInstructions}` : "",
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
          turn_detection: { type: "server_vad", create_response: false },
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
      modalities: ["audio"],
      instructions: [
        `You are the AI interviewer. Start speaking immediately.`,
        `Greet ${name} warmly and welcome them to their Dark Alpha Capital interview for the ${position} position${round}.`,
        "Briefly explain that you will ask interview questions one at a time and they should answer out loud when prompted.",
        "Ask if they are ready to begin. Keep it concise and professional (under 30 seconds).",
        "Do not ask any interview questions yet.",
      ].join(" "),
    },
  };
}

export function buildAskCurrentQuestionEvent(
  question: InterviewQuestion,
  index: number,
) {
  const prompt = formatQuestion(question, index);

  return {
    type: "response.create",
    response: {
      modalities: ["audio"],
      instructions: `Ask this interview question now. Read it clearly and completely: ${prompt}`,
    },
  };
}

export function buildClosingEvent() {
  return {
    type: "response.create",
    response: {
      modalities: ["audio"],
      instructions: [
        "All interview questions have been completed.",
        "Thank the candidate sincerely for their time and answers.",
        'Clearly say: "Please click the End Interview button on your screen to complete your session."',
        "Do not ask any more questions.",
      ].join(" "),
    },
  };
}
