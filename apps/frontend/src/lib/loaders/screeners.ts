import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { getPositions } from "@workspace/db/modules/positions";
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

export const loadScreenerFormOptions = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async () => {
    const { positions } = await getPositions();
    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
    };
  });

export const loadScreenerEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
    const screener = await getScreenerById(id);
    return { screener };
  });
