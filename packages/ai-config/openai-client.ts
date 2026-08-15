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

export const openai = new Proxy(
  // SAFETY: the proxy target is never read directly; every `get` forwards to
  // the lazily-initialized `getOpenAIClient()` instance.
  {} as OpenAI,
  {
    get(_target, prop) {
      const client = getOpenAIClient();
      const value = client[
        // SAFETY: `prop` is a property name read through the proxy; it is
        // widened to the OpenAI key set for the member lookup below.
        prop as keyof OpenAI
      ];
      return value instanceof Function ? value.bind(client) : value;
    },
  },
);
