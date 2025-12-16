import { Hono } from "hono";
import candidate from "./routes/candidate";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import post from "./routes/post";

const app = new Hono()
  .use(logger())
  .use(
    cors({
      origin: ["https://dac-hr-web.vercel.app", "http://localhost:3000"],
      credentials: true,
    })
  )
  .get("/", (c) => c.text("Hono!"))
  .get("/health", (c) => c.text("OK"))
  .route("/candidate", candidate)
  .route("/post", post);

export default {
  port: parseInt(process.env.PORT || "8080"),
  fetch: app.fetch,
};

export type AppType = typeof app;
