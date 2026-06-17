import { createServerFn } from "@tanstack/react-start";
import {
  getPositions,
  getQuestionById,
  getQuestionsWithRounds,
  getRounds,
  getRoundsByPositionId,
} from "@workspace/db/queries";

type QuestionsIndexInput = {
  search?: string;
  position?: string[];
  round?: string[];
  page?: number;
};

export const loadQuestionsIndex = createServerFn({ method: "GET" })
  .validator((data: QuestionsIndexInput) => data)
  .handler(async ({ data: deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, rounds, questionsResult] = await Promise.all([
      getPositions(),
      getRounds(),
      getQuestionsWithRounds(
        deps.search || undefined,
        deps.position && deps.position.length > 0 ? deps.position : undefined,
        deps.round && deps.round.length > 0 ? deps.round : undefined,
        currentPage,
        limit,
      ),
    ]);

    const { questions, total } = questionsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      rounds,
      questions,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.search || deps.position?.length || deps.round?.length,
      ),
    };
  });

type QuestionsNewInput = {
  position?: string;
  round?: string;
};

export const loadQuestionsNew = createServerFn({ method: "GET" })
  .validator((data: QuestionsNewInput) => data)
  .handler(async ({ data: deps }) => {
    const { positions } = await getPositions();
    const rounds = deps.position
      ? (await getRoundsByPositionId(deps.position)).map((round) => ({
          id: round.id,
          name: round.name,
          description: round.description,
        }))
      : [];

    return {
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      rounds,
      preSelectedPositionId: deps.position ?? "",
      preSelectedRoundId: deps.round ?? "",
    };
  });

export const loadQuestionById = createServerFn({ method: "GET" })
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
    const question = await getQuestionById(id);
    return { question };
  });
