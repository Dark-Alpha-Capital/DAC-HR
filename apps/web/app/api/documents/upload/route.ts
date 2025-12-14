import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the file from form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 500MB limit" },
        { status: 400 }
      );
    }

    // Block video file types
    const videoTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-ms-wmv",
      "video/webm",
      "video/ogg",
      "video/x-matroska",
      "video/3gpp",
      "video/x-flv",
    ];

    if (videoTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Video files are not allowed. Please upload other file types.",
        },
        { status: 400 }
      );
    }

    // Upload file to storage
    const url = await uploadFile(file);

    if (!url) {
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "upload_document",
        entityType: "document",
        entityId: url, // Using URL as entity ID since we don't have a document ID yet
        details: {
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            url,
          },
          uploadedBy: {
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

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
