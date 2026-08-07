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

Templates live in `templates.ts` (pure render functions → subject/html/text)
and are unit-testable without a mail client. Add new templates there and
export the type via `EmailTemplateName`.

## Binding

`wrangler.jsonc`: `"send_email": [{ "name": "EMAIL" }]`.

The from-domain must be onboarded for Email Sending first:
`npx wrangler email sending enable darkalphacapital.com`.

Sends are guarded with `if (env.EMAIL)` so local dev without the binding no-ops.
