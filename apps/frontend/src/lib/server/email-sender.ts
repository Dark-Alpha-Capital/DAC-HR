import { env } from "cloudflare:workers";

/** Public base URL used to build shareable links in emails. */
export function getPublicBaseUrl(): string {
  const binding = env.BETTER_AUTH_URL;
  if (binding.trim()) {
    return binding.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
