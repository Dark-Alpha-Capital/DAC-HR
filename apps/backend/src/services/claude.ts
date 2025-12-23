import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ClaudeResponse {
  content: string;
  tokensUsed: number;
  processingTimeMs: number;
}

/**
 * Analyze content using Claude API
 */
export async function analyzeWithClaude(
  prompt: string,
  systemPrompt?: string
): Promise<ClaudeResponse> {
  const startTime = Date.now();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const processingTime = Date.now() - startTime;
    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      processingTimeMs: processingTime,
    };
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error(`Claude API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse JSON response from Claude with error handling
 */
export function parseClaudeJSON<T>(response: ClaudeResponse): T {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonString = response.content;

    // Remove markdown code blocks
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    }

    return JSON.parse(jsonString.trim()) as T;
  } catch (error) {
    console.error('Failed to parse Claude response as JSON:', response.content);
    throw new Error('Invalid JSON response from Claude');
  }
}

/**
 * Analyze with Claude and parse JSON response
 */
export async function analyzeWithClaudeJSON<T>(
  prompt: string,
  systemPrompt?: string
): Promise<{ data: T; tokensUsed: number; processingTimeMs: number }> {
  const response = await analyzeWithClaude(prompt, systemPrompt);
  const data = parseClaudeJSON<T>(response);

  return {
    data,
    tokensUsed: response.tokensUsed,
    processingTimeMs: response.processingTimeMs,
  };
}
