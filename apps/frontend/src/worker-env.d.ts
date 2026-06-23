/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  DOCUMENT_INDEXING_WORKFLOW: Workflow;
  INTERVIEW_EVALUATION_WORKFLOW: Workflow;
  INTERVIEW_SESSION_DO: DurableObjectNamespace;
  OPENAI_API_KEY: string;
  NEXTCLOUD_URL: string;
  NEXTCLOUD_USER: string;
  NEXTCLOUD_PASSWORD: string;
  BETTER_AUTH_URL: string;
}
