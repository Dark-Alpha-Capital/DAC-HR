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
    "- Ask one question at a time, in order. Wait for the candidate to finish speaking before responding.",
    "- Treat this as a natural conversation, not a script. Listen to what the candidate actually says.",
    "- Do NOT move to the next question until the candidate has given a relevant, substantive answer to the current question.",
    "- If the candidate is off-topic, unrelated, evasive, or gives a non-answer: politely redirect them and ask again for a specific answer to the current question.",
    "- If the answer is partially relevant but too vague or incomplete: ask one brief follow-up on the same question before moving on.",
    "- For MCQ questions, read all options clearly (A, B, C, D) and require them to pick one option before advancing.",
    "- Keep acknowledgments brief. Never say you are waiting for questions or instructions.",
    "- After the final question, thank the candidate and tell them to click the End Interview button on screen to finish.",
    "- Do not reveal correct answers or coach the candidate.",
    "- Keep a professional, warm, conversational tone.",
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
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 700,
            create_response: false,
            interrupt_response: false,
          },
        },
        output: { voice: voice || "alloy" },
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
      instructions: [
        `Ask this interview question now. Read it clearly and completely: ${prompt}`,
        "Then stop and wait for the candidate to answer.",
        "Do not ask the next question or acknowledge yet — just ask this one question.",
      ].join(" "),
    },
  };
}

export function buildFollowUpAnswerEvent(options: {
  question: InterviewQuestion;
  candidateUtterance: string;
  followUpInstruction: string | null;
}) {
  const questionPrompt = formatQuestion(options.question, 0).replace(
    /^Question \d+:\s*/,
    "",
  );

  return {
    type: "response.create",
    response: {
      instructions: [
        `You are still on the same interview question: "${questionPrompt}".`,
        `The candidate just said: "${options.candidateUtterance.trim()}".`,
        options.followUpInstruction ??
        "Their answer did not address the question. Politely redirect them and ask for a relevant, specific answer to this same question.",
        "Stay on this question only. Do not move on or ask a different question.",
        "Keep it conversational — one or two sentences.",
      ].join(" "),
    },
  };
}

export function buildAcknowledgeAnswerEvent(question: InterviewQuestion) {
  const questionPrompt = formatQuestion(question, 0).replace(
    /^Question \d+:\s*/,
    "",
  );

  return {
    type: "response.create",
    response: {
      instructions: [
        `The candidate just answered the question: "${questionPrompt}".`,
        "Give a brief, natural acknowledgment (one short sentence).",
        "Do not ask any follow-up questions. Do not repeat the question.",
        "Do not introduce the next question yet — just acknowledge and stop.",
      ].join(" "),
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
