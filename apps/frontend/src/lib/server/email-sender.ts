import { env } from "cloudflare:workers";
import type { EmailSender } from "@workspace/mail";

/**
 * Resolves the Cloudflare Email Service binding, or null when unavailable
 * (e.g. local dev without the binding configured). Callers should no-op when
 * this returns null so email failures never break the primary action.
 */
export function getServerEmailSender(): EmailSender | null {
  const binding = (env).EMAIL;
  if (binding && typeof binding === "object" && "send" in binding) {
    return binding as EmailSender;
  }
  return null;
}

/** Public base URL used to build shareable links in emails. */
export function getPublicBaseUrl(): string {
  const binding = (env).BETTER_AUTH_URL;
  if (typeof binding === "string" && binding.trim()) {
    return binding.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
