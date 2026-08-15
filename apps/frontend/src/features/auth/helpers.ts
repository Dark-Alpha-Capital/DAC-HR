// TEMP: Domain restriction disabled — allow any email to sign in
// export const ALLOWED_EMAIL_DOMAIN = "darkalphacapital.com";

// export const ALLOWED_EMAIL_SUFFIX = `@${ALLOWED_EMAIL_DOMAIN}`;

export const UNAUTHORIZED_DOMAIN_MESSAGE =
  "Only Dark Alpha Capital (@darkalphacapital.com) email addresses can access this site.";

export function isAllowedEmail(_email: string | null | undefined): boolean {
  // return !!email?.toLowerCase().endsWith(ALLOWED_EMAIL_SUFFIX);
  return true;
}
