/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    VECTORIZE: VectorizeIndex;
    DOCUMENT_INDEXING_WORKFLOW: Workflow;
    INTERVIEW_EVALUATION_WORKFLOW: Workflow;
    CANDIDATE_IMPORT_WORKFLOW: Workflow;
    INTERVIEW_SESSION_DO: DurableObjectNamespace;
    // Cloudflare Queue producer binding; message carries { outboxId } (pointer).
    // Structurally matches OutboxPointerMessage in lib/queues/queue-config.ts.
    OUTBOUND_EMAIL_QUEUE: Queue<{ outboxId: string }>;
    BETTER_AUTH_URL: string;
    // Secrets — set via Cloudflare dashboard or `wrangler secret put`, not wrangler.jsonc vars
    OPENAI_API_KEY: string;
    AI_API_KEY?: string;
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    NEXTCLOUD_URL: string;
    NEXTCLOUD_USER: string;
    NEXTCLOUD_PASSWORD: string;
    RESEND_API_KEY: string;
    PRISMIC_REPOSITORY_NAME: string;
    PRISMIC_TEAM_MEMBER_TYPE?: string;
    PRISMIC_OPERATING_MEMBER_TYPE?: string;
    PRISMIC_ACCESS_TOKEN?: string;
  }
}

interface Env extends Cloudflare.Env {}
