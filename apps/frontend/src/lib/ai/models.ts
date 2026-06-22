import { getOpenAIProvider } from "@workspace/ai-config";

export const getAiModel = (modelName: string = "gpt-4o-mini") => {
  const openai = getOpenAIProvider();
  return openai(modelName);
};
