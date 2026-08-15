import { env } from "cloudflare:workers";
import type { EmailSender } from "@workspace/mail";

/**
 * Resolves the Cloudflare Email Service binding, or null when unavailable
 * (e.g. local dev without the binding configured). Callers should no-op when
 * this returns null so email failures never break the primary action.
 */
export function getServerEmailSender(): EmailSender | null {
  const binding = env.EMAIL;
  if (binding && "send" in binding) {
    // SAFETY: the EMAIL binding's `send` accepts a builder-shaped message that
    // matches EmailSender.send; the structural mismatch is only the extra
    // overloads declared on the platform's SendEmail type.
    return binding as EmailSender;
  }
  return null;
}

/** Public base URL used to build shareable links in emails. */
export function getPublicBaseUrl(): string {
  const binding = env.BETTER_AUTH_URL;
  if (binding.trim()) {
    return binding.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
