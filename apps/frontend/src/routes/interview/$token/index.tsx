import { createFileRoute } from "@tanstack/react-router";
import { InterviewPage } from "#/features/voice-interview/components/interview-page";

export const Route = createFileRoute("/interview/$token/")({
  head: () => ({
    meta: [{ title: "Interview - DAC-HR" }],
  }),
  component: InterviewPage,
});
