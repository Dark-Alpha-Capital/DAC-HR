import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import {
  getAllScreeners,
  getScreenerById,
} from "@workspace/db/repositories/screener-repository";

export const loadScreenersIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async () => {
    const screeners = await getAllScreeners();
    return { screeners };
  });

export const loadScreenerEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
    const screener = await getScreenerById(id);
    return { screener };
  });
