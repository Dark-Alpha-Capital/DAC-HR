import { createFileRoute } from "@tanstack/react-router";
import { AiFeaturesDocsPage as AiFeaturesPage } from "#/features/docs/components/ai-features-page";

export const Route = createFileRoute("/_main/docs/ai-features")({
  head: () => ({
    meta: [{ title: "AI Features - DAC HR" }],
  }),
  component: AiFeaturesPage,
});
