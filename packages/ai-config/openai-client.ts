import OpenAI from "openai";

let cachedClient: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) {
    return cachedClient;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please configure it in your environment variables.",
    );
  }

  cachedClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return cachedClient;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAIClient();
    const value = client[prop as keyof OpenAI];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
