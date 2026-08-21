export const ALLOWED_EMAIL_DOMAIN = "darkalphacapital.com";

export const ALLOWED_EMAIL_SUFFIX = `@${ALLOWED_EMAIL_DOMAIN}`;

export const UNAUTHORIZED_DOMAIN_MESSAGE =
  "Only Dark Alpha Capital (@darkalphacapital.com) email addresses can access this site.";

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email?.toLowerCase().endsWith(ALLOWED_EMAIL_SUFFIX);
}

/** Hosts Better Auth may use as the OAuth callback origin (request Host). */
export const AUTH_ALLOWED_HOSTS: string[] = [
  "localhost",
  "localhost:3000",
  "127.0.0.1",
  "127.0.0.1:3000",
  "recruiting.darkalphacapital.com",
];

export const AUTH_BASE_URL_FALLBACK =
  "https://recruiting.darkalphacapital.com";

export const authBaseURLConfig = {
  allowedHosts: AUTH_ALLOWED_HOSTS,
  fallback: AUTH_BASE_URL_FALLBACK,
  protocol: "auto" as const,
};
