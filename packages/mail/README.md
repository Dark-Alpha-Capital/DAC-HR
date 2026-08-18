# @workspace/mail

Transactional email for the HR Automation platform, sent via **Resend**. The
package only renders + sends; delivery is orchestrated by the outbox + queue
consumer in `apps/frontend/src/lib/queues/` (never call Resend from request
handlers or services directly).

## Usage

Enqueue a job through the outbox (see `apps/frontend/src/lib/queues/enqueue.ts`):

```ts
import { enqueueEmail } from "#/lib/queues/enqueue";

await enqueueEmail(db, [
  {
    jobName: "interview-invite",
    jobId: `interview-invite-${bundleId}`,
    dedupeKey: `interview-invite:${bundleId}:${candidateEmail}`,
    data: {
      type: "interview-invite",
      to: candidateEmail,
      candidateName: "Jane Doe",
      positionName: "Analyst",
      interviewUrl: "https://recruiting.darkalphacapital.com/interview/abc",
      expiresAt: new Date().toISOString(),
    },
  },
]);
```

The consumer (`apps/frontend/src/lib/queues/consume.ts`) re-reads the outbox
row, zod-validates the payload at the I/O boundary, and calls
`processEmailJob(resend, jobData, { idempotencyKey: outboxId })`.

## API

- `createResendClient(apiKey)` — Resend client.
- `renderEmailTemplate(jobData)` — switch over `EmailJobData.type`, renders a
  React Email template via `render()`; throws on unknown types.
- `sendEmail(resend, to, subject, html, { idempotencyKey? })` — throws if
  `response.error`.
- `processEmailJob(resend, jobData, opts?)` — render + send, returns
  `{ success, emailId, to, type }`.

Templates are React Email components (`emails/*.tsx`). Register a new email
kind by adding a variant to the `EmailJobData` union in `types.ts`, a case in
`renderEmailTemplate`, a zod entry in `parse-email-job-data.ts`, and a template
in `emails/`.

## Configuration

`RESEND_API_KEY` is read from the Worker environment (`.dev.vars` locally,
`wrangler secret put` in production). The `from` address lives in
`EMAIL_CONFIG.from` in `types.ts`.
