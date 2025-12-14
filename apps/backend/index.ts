import { Hono } from "hono";

const app = new Hono()
  .get("/", (c) => c.text("Hono!"))
  .get("/health", (c) => c.text("OK"));

export default {
  port: parseInt(process.env.PORT || "8080"),
  fetch: app.fetch,
};

export type AppType = typeof app;
