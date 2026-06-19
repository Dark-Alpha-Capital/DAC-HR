import { openai } from "./openai-client";

const EMBEDDING_MODEL = "text-embedding-3-small";
// Must match hr-documents-index dimensions (wrangler vectorize binding).
const EMBEDDING_DIMENSIONS = 768;
const MAX_TOKENS_PER_CHUNK = 500;

export function chunkText(
  text: string,
  maxTokens: number = MAX_TOKENS_PER_CHUNK,
  overlap: number = 50,
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const words = text.split(/\s+/);
  const chunks: string[] = [];

  if (words.length <= maxTokens) {
    return [text.trim()];
  }

  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + maxTokens, words.length);
    chunks.push(words.slice(i, end).join(" "));
    i += maxTokens - overlap;
    if (i >= words.length) break;
  }

  return chunks;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, MAX_TOKENS_PER_CHUNK };
