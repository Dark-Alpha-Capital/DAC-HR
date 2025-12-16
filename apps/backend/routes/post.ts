import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";

const postRoute = new Hono().use(authMiddleware).post("/", async (c) => {
  return c.json({ message: "Hello, world!" });
});

export default postRoute;
