import { describe, expect, test } from "bun:test";
import { resolveDynamicBaseURL } from "better-auth";

import { authBaseURLConfig } from "../helpers";

const AUTH_PATH = "/api/auth";

function requestFor(origin: string): Request {
  return new Request(`${origin}/api/auth/sign-in/social`, {
    headers: { host: new URL(origin).host },
  });
}

describe("auth base URL (Google OAuth callback origin)", () => {
  test("local requests keep the callback on localhost, not production", () => {
    const resolved = resolveDynamicBaseURL(
      authBaseURLConfig,
      requestFor("http://localhost:3000"),
      AUTH_PATH,
    );

    expect(resolved.startsWith("http://localhost:3000")).toBe(true);
    expect(resolved).not.toContain("recruiting.darkalphacapital.com");
  });

  test("production requests keep the callback on the deployed host", () => {
    const resolved = resolveDynamicBaseURL(
      authBaseURLConfig,
      requestFor("https://recruiting.darkalphacapital.com"),
      AUTH_PATH,
    );

    expect(resolved.startsWith("https://recruiting.darkalphacapital.com")).toBe(
      true,
    );
  });
});
