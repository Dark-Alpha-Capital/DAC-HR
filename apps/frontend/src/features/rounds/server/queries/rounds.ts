import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { roundsService } from "../rounds-service";

type RoundsIndexInput = {
  type?: string[];
  page?: number;
};

export const loadRoundsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: RoundsIndexInput) => data)
  .handler(async ({ data: deps }) => roundsService.list(deps));

export const loadRoundsNew = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { position?: string }) => data)
  .handler(async ({ data: deps }) => roundsService.getNewOptions(deps.position));

export const loadRoundById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => roundsService.getById(id));

export const loadRoundEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => roundsService.getEdit(id));

export const loadRoundAddQuestion = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { roundId: string; position?: string }) => data)
  .handler(async ({ data }) => roundsService.getAddQuestionOptions(data));
