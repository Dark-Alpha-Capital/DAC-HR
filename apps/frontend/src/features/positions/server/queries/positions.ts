import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { positionsService } from "../positions-service";

type PositionsIndexInput = {
  search?: string;
  hireLevel?: string[];
  status?: string[];
  page?: number;
};

export const loadPositionsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: PositionsIndexInput) => data)
  .handler(async ({ data: deps }) => positionsService.list(deps));

export const loadPositionBySlug = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: slug }) => positionsService.getBySlug(slug));

export const loadPositionEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: slug }) => positionsService.getEdit(slug));

export const loadPositionOptions = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(() => positionsService.getOptions());
