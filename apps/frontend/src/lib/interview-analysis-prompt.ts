import { getOptionLabel } from "./question-options";
import type { QuestionOption } from "@workspace/db/question-types";
import type { Screener } from "@workspace/db/schema";
import type { getInterviewById } from "@workspace/db/repositories/interview-repository";
import { getBundleRounds } from "@workspace/db/repositories/interview-bundle-repository";
import {
  getResponsesBySessionId,
  getSessionByInterviewId,
} from "@workspace/db/repositories/interview-session-repository";

type Interview = NonNullable<Awaited<ReturnType<typeof getInterviewById>>>;

type ApplicationContext = {
  position: { name: string; description: string | null };
  candidate?: { firstName: string; lastName: string } | null;
};

function formatSessionAnswer(response: {
  transcript: string | null;
  answerText: string | null;
  selectedOptionId: string | null;
  question: {
    options: QuestionOption[] | null;
  };
}): string {
  if (response.transcript?.trim()) {
    return response.transcript.trim();
  }
  if (response.answerText?.trim()) {
    return response.answerText.trim();
  }
  const label = getOptionLabel(
    response.question.options as QuestionOption[] | null,
    response.selectedOptionId,
  );
  if (label) {
    return label;
  }
  if (response.selectedOptionId) {
    return response.selectedOptionId;
  }
  return "No answer";
}

async function buildAiSessionResponseBlock(interviewId: string): Promise<{
  responseBlock: string;
  sessionMeta: string[];
}> {
  const sessionRow = await getSessionByInterviewId(interviewId);
  if (!sessionRow) {
    return {
      responseBlock: "No session responses recorded.",
      sessionMeta: [],
    };
  }

  const responses = await getResponsesBySessionId(sessionRow.session.id);
  const sessionMeta: string[] = [
    `Delivery mode: ${sessionRow.session.deliveryMode}`,
  ];

  if (sessionRow.session.cheatingSummary) {
    sessionMeta.push(
      `Cheating signals: ${JSON.stringify(sessionRow.session.cheatingSummary)}`,
    );
  }

  if (responses.length === 0) {
    return {
      responseBlock: "No responses recorded for this session.",
      sessionMeta,
    };
  }

  const responseBlock = responses
    .map((response, index) => {
      const answer = formatSessionAnswer(response);
      return `Q${index + 1} (${response.question.questionType}, input: ${response.inputMethod ?? "unknown"}): ${response.question.questionText}\nA: ${answer}`;
    })
    .join("\n\n");

  return { responseBlock, sessionMeta };
}

function buildManualResponseBlock(interview: Interview): string {
  const questions = interview.questions ?? [];
  if (questions.length === 0) {
    return "No questions configured for this interview.";
  }

  return questions
    .map((question, index) => {
      const notes = question.feedback?.notes?.trim();
      const rating = question.feedback?.rating;
      const answer = notes || "No response recorded";
      const ratingSuffix =
        rating != null ? ` (Recruiter rating: ${rating}/5)` : "";
      return `Q${index + 1}: ${question.questionText}\nA: ${answer}${ratingSuffix}`;
    })
    .join("\n\n");
}

export async function buildInterviewAnalysisPrompt(params: {
  screener: Screener;
  interview: Interview;
  application: ApplicationContext;
  customPrompt?: string | null;
}): Promise<string> {
  const { screener, interview, application, customPrompt } = params;

  let responseBlock: string;
  const extraContext: string[] = [];

  if (interview.mode === "ai_session") {
    const { responseBlock: block, sessionMeta } =
      await buildAiSessionResponseBlock(interview.id);
    responseBlock = block;
    extraContext.push(...sessionMeta);
  } else {
    responseBlock = buildManualResponseBlock(interview);
    if (interview.overallFeedback?.trim()) {
      extraContext.push(`Overall recruiter feedback: ${interview.overallFeedback}`);
    }
    if (interview.rating != null) {
      extraContext.push(`Overall recruiter rating: ${interview.rating}/5`);
    }
  }

  const candidateLine = application.candidate
    ? `Candidate: ${application.candidate.firstName} ${application.candidate.lastName}`
    : null;

  const positionDescription = application.position.description
    ? ` — ${application.position.description}`
    : "";

  return [
    "## Screener criteria",
    screener.content,
    "",
    "## Context",
    `Position: ${application.position.name}${positionDescription}`,
    `Round: ${interview.roundTemplate.name} | Status: ${interview.status} | Mode: ${interview.mode}`,
    candidateLine,
    ...extraContext,
    "",
    "## Responses",
    responseBlock,
    customPrompt?.trim()
      ? `\n## Additional instructions\n${customPrompt.trim()}`
      : null,
    "",
    "Analyze the candidate against the screener criteria. Output: performance, alignment with position requirements, strengths/concerns, per-question breakdown, and hiring recommendation.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatBundleSessionResponses(
  responses: Awaited<ReturnType<typeof getResponsesBySessionId>>,
): string {
  if (responses.length === 0) {
    return "No responses recorded for this round.";
  }

  return responses
    .map((response, index) => {
      const answer = formatSessionAnswer(response);
      return `Q${index + 1} (${response.question.questionType}, input: ${response.inputMethod ?? "unknown"}): ${response.question.questionText}\nA: ${answer}`;
    })
    .join("\n\n");
}

export async function buildBundleInterviewAnalysisPrompt(params: {
  screener: Screener;
  bundleId: string;
  application: ApplicationContext;
  roundCount: number;
  customPrompt?: string | null;
}): Promise<string> {
  const { screener, bundleId, application, roundCount, customPrompt } = params;
  const rounds = await getBundleRounds(bundleId);
  const extraContext: string[] = [
    `Position interview bundle with ${roundCount} configured round(s).`,
  ];
  const roundSections: string[] = [];

  for (const roundRow of rounds) {
    const responses = await getResponsesBySessionId(roundRow.session.id);
    const roundName = roundRow.round.name;
    const deliveryMode = roundRow.bundleRound.deliveryMode;
    const roundStatus = roundRow.bundleRound.status;

    extraContext.push(
      `Round "${roundName}": ${deliveryMode} delivery, status ${roundStatus}, session ${roundRow.session.status}`,
    );

    if (roundRow.session.cheatingSummary) {
      extraContext.push(
        `Round "${roundName}" cheating signals: ${JSON.stringify(roundRow.session.cheatingSummary)}`,
      );
    }

    roundSections.push(
      [
        `### ${roundName} (${deliveryMode})`,
        formatBundleSessionResponses(responses),
      ].join("\n"),
    );
  }

  const candidateLine = application.candidate
    ? `Candidate: ${application.candidate.firstName} ${application.candidate.lastName}`
    : null;

  const positionDescription = application.position.description
    ? ` — ${application.position.description}`
    : "";

  return [
    "## Screener criteria",
    screener.content,
    "",
    "## Context",
    `Position: ${application.position.name}${positionDescription}`,
    candidateLine,
    ...extraContext,
    "",
    "## Responses (all rounds)",
    roundSections.join("\n\n"),
    customPrompt?.trim()
      ? `\n## Additional instructions\n${customPrompt.trim()}`
      : null,
    "",
    "Analyze the candidate holistically across every round above against the screener criteria. Consider voice and form rounds together. Output: performance, alignment with position requirements, strengths/concerns, per-question breakdown grouped by round, and hiring recommendation.",
  ]
    .filter(Boolean)
    .join("\n");
}
