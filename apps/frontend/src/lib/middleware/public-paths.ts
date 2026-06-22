const PUBLIC_PAGE_PATHS = new Set(["/login", "/unauthorized"]);

const PUBLIC_PAGE_PREFIXES = ["/interview/"] as const;

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/login/google",
  "/api/interview-token",
] as const;

export function isPublicPagePath(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
