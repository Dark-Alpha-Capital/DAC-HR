import { NextRequest, NextResponse } from "next/server";
import { getDocumentsByCandidateId } from "@workspace/db/queries";
import { auth } from "@/auth";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: candidateId } = await params;

    if (!candidateId) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    const documents = await getDocumentsByCandidateId(candidateId);

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidate documents", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

