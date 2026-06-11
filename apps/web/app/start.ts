import { createStart } from "@tanstack/react-start";
import { apiAuthGuard } from "@/lib/middleware/api-auth-guard";
import { requestLogger } from "@/lib/middleware/request-logger";

export const startInstance = createStart(() => ({
  requestMiddleware: [requestLogger, apiAuthGuard],
}));
