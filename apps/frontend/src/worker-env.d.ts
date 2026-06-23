/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  DOCUMENT_INDEXING_WORKFLOW: Workflow;
  INTERVIEW_EVALUATION_WORKFLOW: Workflow;
  INTERVIEW_SESSION_DO: DurableObjectNamespace;
  BETTER_AUTH_URL: string;
  // Secrets — set via Cloudflare dashboard or `wrangler secret put`, not wrangler.jsonc vars
  OPENAI_API_KEY: string;
  AI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  NEXTCLOUD_URL: string;
  NEXTCLOUD_USER: string;
  NEXTCLOUD_PASSWORD: string;
}
