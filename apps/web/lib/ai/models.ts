import { GoogleGenAI } from "@google/genai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
export const googleGenAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
