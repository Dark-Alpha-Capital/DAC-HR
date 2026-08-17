# @workspace/mail

Transactional email for the HR Automation platform, sent via the Cloudflare
Email Service `send_email` binding.

## Usage

```ts
import { sendMail } from "@workspace/mail";

await sendMail({
  sender: env.EMAIL, // SendEmail binding (guarded if undefined in dev)
  to: "candidate@example.com",
  template: "interview-invite",
  data: {
    candidateName: "Jane Doe",
    positionName: "Analyst",
    interviewUrl: "https://recruiting.darkalphacapital.com/interview/abc",
    expiresAt: new Date(),
  },
});
```

Templates are React Email components (`emails/*.tsx`) rendered to
subject/html/text at send time via `@react-email/render`. Register new
templates in `templates.ts` (a `subject` builder + the component) and export
the type via `EmailTemplateName`. Rendering is unit-testable via `renderEmail`
without a mail client.

## Binding

`wrangler.jsonc`: `"send_email": [{ "name": "EMAIL" }]`.

The from-domain must be onboarded for Email Sending first:
`npx wrangler email sending enable darkalphacapital.com`.

Sends are guarded with `if (env.EMAIL)` so local dev without the binding no-ops.
