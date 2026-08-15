import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { screenersService } from "../screeners-service";

export const loadScreenersIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(() => screenersService.list());

export const loadScreenerFormOptions = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(() => screenersService.getFormOptions());

export const loadScreenerEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(({ data: id }) => screenersService.getById(id));
