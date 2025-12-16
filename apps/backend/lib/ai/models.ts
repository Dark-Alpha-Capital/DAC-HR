import { GoogleGenAI } from "@google/genai";

export const CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME =
  "fileSearchStores/candidatedocumentssearchsto-ihh3ywli34wi";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
export const googleGenAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
