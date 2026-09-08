import { env } from "cloudflare:workers";

const LOCAL_DEV_BASE_URL = "http://localhost:3000";

/**
 * Public base URL used to build shareable links in emails.
 *
 * During local development (Vite dev) this returns the local dev server, NOT
 * the `BETTER_AUTH_URL` binding — the binding points at the deployed domain,
 * so an email created while developing would otherwise hand the candidate a
 * production link that cannot see the just-created local record.
 */
export function getPublicBaseUrl(): string {
  if (import.meta.env.DEV) {
    return LOCAL_DEV_BASE_URL;
  }
  const binding = env.BETTER_AUTH_URL;
  if (binding.trim()) {
    return binding.replace(/\/$/, "");
  }
  return LOCAL_DEV_BASE_URL;
}

/** Default address CC'd on interview-completion notifications. */
export function getRecruitingEmail(): string {
  const value = env.RECRUITING_EMAIL;
  if (value?.trim()) {
    return value.trim();
  }
  return "kathleen@darkalphacapital.com";
}
