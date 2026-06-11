import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME =
  process.env.CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME ??
  "fileSearchStores/candidatedocumentssearchsto-ihh3ywli34wi";

export const googleAIClient = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});
