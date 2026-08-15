import { env } from "cloudflare:workers";
import type { EmailSender } from "@workspace/mail";

/**
 * Resolves the Cloudflare Email Service binding, or null when unavailable
 * (e.g. local dev without the binding configured). Callers should no-op when
 * this returns null so email failures never break the primary action.
 */
export function getServerEmailSender(): EmailSender | null {
  const binding = env.EMAIL;
  if (!binding || !("send" in binding)) {
    return null;
  }

  // SAFETY: the EMAIL binding's `send` builder accepts a message shaped as
  // { to, from, subject, html, text }. `from` accepts either a plain email
  // string or an { email, name } object — we pass the display name only when
  // one is set, so the runtime call stays within the binding's accepted shape.
  return {
    send: async (input) => {
      await binding.send({
        to: input.to,
        from: input.from.name
          ? { email: input.from.email, name: input.from.name }
          : input.from.email,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    },
  };
}

/** Public base URL used to build shareable links in emails. */
export function getPublicBaseUrl(): string {
  const binding = env.BETTER_AUTH_URL;
  if (binding.trim()) {
    return binding.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
