import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { apiAuthGuard } from "~/lib/middleware/api-auth-guard";
import { requestLogger } from "~/lib/middleware/request-logger";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, requestLogger, apiAuthGuard],
}));
