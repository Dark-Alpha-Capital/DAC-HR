import { createOpenAI } from "@ai-sdk/openai";

let cachedProvider: ReturnType<typeof createOpenAI> | undefined;

export function getOpenAIProvider() {
  if (cachedProvider) {
    return cachedProvider;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please configure it in your environment variables.",
    );
  }

  cachedProvider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return cachedProvider;
}
