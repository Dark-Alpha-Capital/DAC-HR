import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth);

async function withRedirectOnUnauthorized(
  fn: (req: NextRequest) => Promise<Response>,
  req: NextRequest,
) {
  const res = await fn(req);
  const isCallback = req.nextUrl.pathname.includes("/callback/");
  if (isCallback && res.status >= 400 && res.status < 500) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }
  return res;
}

export async function GET(req: NextRequest) {
  return withRedirectOnUnauthorized(handler.GET, req);
}

export async function POST(req: NextRequest) {
  return withRedirectOnUnauthorized(handler.POST, req);
}
