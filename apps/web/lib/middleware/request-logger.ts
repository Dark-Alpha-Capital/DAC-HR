import { createMiddleware } from "@tanstack/react-start";

export const requestLogger = createMiddleware().server(
  async ({ request, next }) => {
    const startTime = Date.now();
    const { method, url } = request;
    const pathname = new URL(url).pathname;

    try {
      const result = await next();
      const duration = Date.now() - startTime;
      console.info(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "info",
          msg: `${method} ${pathname}`,
          data: { status: result.response.status, ms: duration },
        }),
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          msg: `${method} ${pathname}`,
          data: {
            ms: duration,
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );
      throw error;
    }
  },
);
