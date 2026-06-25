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
    "- Always accept the candidate's answer and move to the next question — even if it is wrong, off-topic, vague, or incomplete. Never ask them to try again, redirect, or say 'not quite'.",
    "- After any real answer, give a brief acknowledgment (e.g. 'Thank you.') and proceed to the next question.",
    "- If you hear background noise, gibberish, filler sounds, or a random unrelated word instead of a real answer: ask the candidate to please ensure their surroundings are stable and silenced, then repeat the current question. Do NOT advance.",
    "- For MCQ questions, read all options clearly (A, B, C, D). Accept whatever option they choose and move on — do not ask them to pick again.",
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
        "You did not hear a clear answer — only noise or gibberish. Politely ask the candidate to please ensure their surroundings are stable and silenced, then repeat the current question. Do not advance.",
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
        "Give a brief, natural acknowledgment (one short sentence such as 'Thank you.' or 'Got it, thank you.').",
        "Do NOT evaluate correctness, say 'not quite', or ask them to try again.",
        "Do not ask any follow-up questions. Do not repeat the question.",
        "Do not introduce the next question yet — just acknowledge and stop.",
      ].join(" "),
    },
  };
}

export function buildIntroFollowUpEvent(options: {
  candidateUtterance: string;
  followUpInstruction: string;
}) {
  return {
    type: "response.create",
    response: {
      instructions: [
        "You are welcoming the candidate before the interview begins.",
        `The candidate just said: "${options.candidateUtterance.trim()}".`,
        options.followUpInstruction,
        "Do not ask any interview questions yet.",
        "Keep it brief and professional.",
      ].join(" "),
    },
  };
}

export function buildClosingEvent(options?: { isPractice?: boolean }) {
  const buttonLabel = options?.isPractice
    ? "Exit Practice button"
    : "End Interview button";

  return {
    type: "response.create",
    response: {
      instructions: [
        options?.isPractice
          ? "This was a practice session with sample questions."
          : "All interview questions have been completed.",
        options?.isPractice
          ? "Thank the candidate for trying the practice session and let them know they can start the real interview when ready."
          : "Thank the candidate sincerely for their time and answers.",
        `Clearly say: "Please click the ${buttonLabel} on your screen to complete your session."`,
        "Do not ask any more questions.",
      ].join(" "),
    },
  };
}
