import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/storage";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { z } from "zod";

const documentUrlSchema = z
  .string()
  .trim()
  .min(1, "Document URL is required")
  .max(2048, "Document URL is too long")
  .refine(
    (value) => {
      if (value.includes("\n") || value.includes("\r")) return false;
      const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
      return !hasScheme || /^https?:/i.test(value);
    },
    { message: "Invalid document URL format" },
  );

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    const parsedUrl = documentUrlSchema.safeParse(url);
    if (!parsedUrl.success) {
      return NextResponse.json(
        { error: parsedUrl.error.issues[0]?.message ?? "Invalid document URL" },
        { status: 400 },
      );
    }

    const signedUrl = await getSignedUrl(parsedUrl.data, 60);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate access URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: signedUrl }, { status: 200 });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
