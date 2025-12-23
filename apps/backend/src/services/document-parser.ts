import { analyzeWithClaudeJSON } from './claude';
import { DOCUMENT_PARSING_PROMPT, fillPrompt } from '../utils/prompts';

export interface ParsedDocument {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience?: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    responsibilities?: string[];
    achievements?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationYear: string;
  }>;
  skills?: string[];
  certifications?: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
  }>;
}

/**
 * Parse document from URL and extract text
 */
export async function extractTextFromDocument(url: string): Promise<string> {
  try {
    // Fetch document
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const bufferNode = Buffer.from(buffer);

    // Determine file type and parse
    if (url.toLowerCase().endsWith('.pdf')) {
      // Dynamic import to avoid Bun ESM issues
      const pdf = (await import('pdf-parse')).default;
      const data = await pdf(bufferNode);
      return data.text;
    } else if (url.toLowerCase().endsWith('.docx')) {
      // Dynamic import to avoid Bun ESM issues
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer: bufferNode });
      return result.value;
    } else if (url.toLowerCase().endsWith('.txt')) {
      return new TextDecoder().decode(buffer);
    } else {
      throw new Error(`Unsupported document format: ${url}`);
    }
  } catch (error) {
    console.error('Document parsing error:', error);
    throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse document and extract structured data using AI
 */
export async function parseDocument(
  url: string
): Promise<{ parsed: ParsedDocument; rawText: string; tokensUsed: number; processingTimeMs: number }> {
  // Extract raw text
  const rawText = await extractTextFromDocument(url);

  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Document appears to be empty');
  }

  // Use Claude to parse and structure the content
  const prompt = fillPrompt(DOCUMENT_PARSING_PROMPT, {
    DOCUMENT_TEXT: rawText,
  });

  const systemPrompt = 'You are an expert document parser. Always return valid JSON only, no additional text.';

  const result = await analyzeWithClaudeJSON<ParsedDocument>(prompt, systemPrompt);

  return {
    parsed: result.data,
    rawText,
    tokensUsed: result.tokensUsed,
    processingTimeMs: result.processingTimeMs,
  };
}

/**
 * Parse resume specifically
 */
export async function parseResume(url: string) {
  return parseDocument(url);
}

/**
 * Parse cover letter (simpler, just extract text)
 */
export async function parseCoverLetter(url: string): Promise<{
  text: string;
  tokensUsed: number;
  processingTimeMs: number;
}> {
  const text = await extractTextFromDocument(url);

  // For cover letters, we don't need complex parsing, just clean text
  return {
    text,
    tokensUsed: 0,
    processingTimeMs: 0,
  };
}
