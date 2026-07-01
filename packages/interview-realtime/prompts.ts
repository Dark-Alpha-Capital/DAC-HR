import type { AgentConfig } from "@workspace/db/enums";
import type { InterviewQuestion, VoiceInterviewPhase } from "./types";

export function formatQuestion(question: InterviewQuestion, index: number): string {
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

export function buildQuestionsSection(questions: InterviewQuestion[]): string {
  if (questions.length === 0) {
    return "## Questions\n\n(No questions configured.)";
  }

  return [
    "## Questions",
    "",
    "Ask these in order — this list is the single source of truth:",
    ...questions.map((question, index) => formatQuestion(question, index)),
  ].join("\n");
}

export function buildRealtimeInstructionBase(options: {
  roundName?: string;
  positionName?: string;
  candidateName?: string;
  questions: InterviewQuestion[];
  agentConfig?: AgentConfig;
}): string {
  const customInstructions = options.agentConfig?.instructions?.trim();
  const questionCount = options.questions.length;

  return [
    "## Role and Objective",
    "You are conducting a structured voice job interview for Dark Alpha Capital.",
    options.positionName
      ? `Position: ${options.positionName}.`
      : "Position: not specified.",
    options.roundName ? `Round: ${options.roundName}.` : "",
    options.candidateName
      ? `Candidate: ${options.candidateName}.`
      : "Candidate name is available in the session.",
    `This interview has ${questionCount} questions total.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildInterviewFlowSection(phase: VoiceInterviewPhase): string {
  switch (phase) {
    case "intro":
      return [
        "## Interview Flow",
        "Phase: INTRO.",
        "- Introduce yourself, welcome the candidate, and explain the format (one question at a time, spoken answers).",
        "- Ask if they are ready to begin. Do not ask interview questions yet.",
      ].join("\n");
    case "awaiting_ready":
      return [
        "## Interview Flow",
        "Phase: AWAITING_READY.",
        "- Wait for a clear readiness confirmation before any interview questions.",
        "- If you hear noise or an unclear response, ask them to confirm when ready.",
        "- Do not ask interview questions until they confirm readiness.",
      ].join("\n");
    case "questions":
      return [
        "## Interview Flow",
        "Phase: QUESTIONS.",
        "- Ask one question at a time from the Questions section, in order.",
        "- Wait for the candidate to finish speaking before responding.",
        "- Always accept any substantive answer and move on — even if wrong, off-topic, vague, or incomplete.",
        "- After a real answer, give a brief acknowledgment (e.g. 'Thank you.') and proceed to the next question.",
        "- If you hear background noise, gibberish, filler sounds, or a random unrelated word: ask them to stabilize and silence their surroundings, then repeat the current question. Do NOT advance.",
        "- For MCQ questions, read all options clearly (A, B, C, D). Accept whatever option they choose.",
        "- Do not reveal correct answers or coach the candidate.",
      ].join("\n");
    case "closing":
    case "awaiting_end":
      return [
        "## Interview Flow",
        "Phase: CLOSING.",
        "- All interview questions are complete.",
        "- Thank the candidate sincerely and tell them to click the End Interview button on screen to finish.",
        "- Do not ask any more questions.",
      ].join("\n");
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function buildSharedBehaviorSections(agentConfig?: AgentConfig): string {
  const customInstructions = agentConfig?.instructions?.trim();

  return [
    "## Personality and Tone",
    "Professional, warm, and conversational — not robotic or scripted.",
    "",
    "## Language",
    "Conduct the interview in English unless the candidate clearly requests another language.",
    "",
    "## Reasoning",
    "Respond quickly for acknowledgments and question delivery. Use brief internal reasoning only when deciding whether audio was unclear vs a real answer.",
    "",
    "## Preambles",
    "Before longer pauses (e.g. moving to the next question), you may say a short spoken update like 'Thank you — next question.' Keep preambles under one sentence.",
    "",
    "## Verbosity",
    "- Acknowledgments: 1–2 sentences maximum.",
    "- Questions: read clearly and completely, including all MCQ options.",
    "- Intro and closing: concise (under 30 seconds).",
    "",
    "## Unclear Audio",
    "- Do not guess what the candidate said.",
    "- If audio is unclear, ask them to repeat. No preamble on unclear audio — just ask to repeat.",
    "- Do not respond to silence, background noise, or non-speech sounds.",
    "- Wait for the candidate; do not fill silence with chatter.",
    customInstructions ? `## Additional Instructions\n${customInstructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildInstructionsForPhase(
  baseInstructions: string,
  questions: InterviewQuestion[],
  phase: VoiceInterviewPhase,
  agentConfig?: AgentConfig,
): string {
  return [
    baseInstructions,
    buildSharedBehaviorSections(agentConfig),
    buildQuestionsSection(questions),
    buildInterviewFlowSection(phase),
  ].join("\n\n");
}

export function buildRealtimeInstructions(options: {
  roundName?: string;
  positionName?: string;
  candidateName?: string;
  questions: InterviewQuestion[];
  agentConfig?: AgentConfig;
}): string {
  const base = buildRealtimeInstructionBase(options);
  return buildInstructionsForPhase(
    base,
    options.questions,
    "intro",
    options.agentConfig,
  );
}

export function buildSessionUpdateEvent(instructions: string, voice?: string) {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      instructions,
      output_modalities: ["audio"],
      reasoning: { effort: "low" },
      truncation: {
        type: "retention_ratio",
        retention_ratio: 0.7,
        token_limits: {
          post_instructions: 6000,
        },
      },
      audio: {
        input: {
          transcription: { model: "whisper-1" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.6,
            prefix_padding_ms: 400,
            silence_duration_ms: 1100,
            create_response: false,
            interrupt_response: false,
          },
        },
        output: { voice: voice || "alloy" },
      },
    },
  };
}

export function buildPhaseSessionUpdateEvent(options: {
  baseInstructions: string;
  questions: InterviewQuestion[];
  phase: VoiceInterviewPhase;
  agentConfig?: AgentConfig;
  voice?: string;
}) {
  const instructions = buildInstructionsForPhase(
    options.baseInstructions,
    options.questions,
    options.phase,
    options.agentConfig,
  );
  return buildSessionUpdateEvent(instructions, options.voice);
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
        "Finish your full welcome before stopping — do not cut yourself off mid-sentence.",
        "Do not ask any interview questions yet.",
      ].join(" "),
    },
  };
}

export function buildAskCurrentQuestionEvent(
  question: InterviewQuestion,
  index: number,
) {
  const questionNumber = index + 1;
  const questionText = formatQuestion(question, index);
  const mcqNote =
    question.questionType === "mcq" && question.options?.length
      ? " Read every MCQ option letter and text (A, B, C, D) clearly."
      : "";

  return {
    type: "response.create",
    response: {
      max_output_tokens: 600,
      instructions: [
        `Read the following interview question (Question ${questionNumber}) out loud now.${mcqNote}`,
        `Question text: "${questionText}"`,
        "Read the entire question verbatim — no preamble, no 'let me ask', no summary.",
        "Read it clearly and completely, then stop and wait for the candidate to answer.",
        "Do not ask the next question or acknowledge yet — just ask this one question.",
      ].join(" "),
    },
  };
}

export function buildFollowUpAnswerEvent(options: {
  question: InterviewQuestion;
  questionIndex: number;
  candidateUtterance: string;
  followUpInstruction: string | null;
}) {
  const questionNumber = options.questionIndex + 1;
  const questionText = formatQuestion(options.question, options.questionIndex);

  return {
    type: "response.create",
    response: {
      max_output_tokens: 120,
      instructions: [
        `You are still on Question ${questionNumber}.`,
        `Question text: "${questionText}"`,
        `The candidate just said: "${options.candidateUtterance.trim()}".`,
        options.followUpInstruction ??
          "You did not hear a clear answer — only noise or gibberish. Politely ask the candidate to please ensure their surroundings are stable and silenced, then repeat the current question. Do not advance.",
        "Stay on this question only. Do not move on or ask a different question.",
        "Keep it conversational — one or two sentences.",
      ].join(" "),
    },
  };
}

export function buildAcknowledgeAnswerEvent(questionIndex: number) {
  const questionNumber = questionIndex + 1;

  return {
    type: "response.create",
    response: {
      max_output_tokens: 80,
      instructions: [
        `The candidate just answered Question ${questionNumber}.`,
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
      max_output_tokens: 120,
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
      max_output_tokens: 150,
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
