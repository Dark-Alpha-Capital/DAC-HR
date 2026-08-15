import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { questionsService } from "../questions-service";

type QuestionsIndexInput = {
  search?: string;
  position?: string[];
  round?: string[];
  page?: number;
};

export const loadQuestionsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: QuestionsIndexInput) => data)
  .handler(async ({ data: deps }) => questionsService.list(deps));

export const loadQuestionsNew = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(() => questionsService.getNewOptions());

export const loadQuestionById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => questionsService.getById(id));
