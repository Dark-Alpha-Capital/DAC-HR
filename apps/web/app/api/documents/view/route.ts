import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/storage";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the document URL from query params
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Document URL is required" },
        { status: 400 }
      );
    }

    console.log("Received URL:", url);

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(url, 60);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate access URL" },
        { status: 500 }
      );
    }

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "view_document",
        entityType: "document",
        entityId: url,
        details: {
          document: {
            url,
            signedUrl,
          },
          viewedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    return NextResponse.json({ url: signedUrl }, { status: 200 });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
