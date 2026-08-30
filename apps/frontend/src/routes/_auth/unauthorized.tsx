import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UnauthorizedPage } from "#/features/auth/components/unauthorized-page";

const unauthorizedSearchSchema = z.object({
  error: z.string().optional(),
});

export const Route = createFileRoute("/_auth/unauthorized")({
  head: () => ({
    meta: [{ title: "Access Denied - DAC-HR" }],
  }),
  validateSearch: (search) => unauthorizedSearchSchema.parse(search),
  component: UnauthorizedPage,
});
