import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleGenAI } from "@google/genai";

export const CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME =
  "fileSearchStores/candidatedocumentssearchsto-ihh3ywli34wi";

export const googleAIClient = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const googleGenAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
