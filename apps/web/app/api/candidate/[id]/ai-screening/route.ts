import { NextRequest, NextResponse } from "next/server";
import {
  getCandidateAiScreenings,
  getLatestCandidateAiScreening,
} from "@workspace/db/queries";
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
    const searchParams = request.nextUrl.searchParams;
    const positionId = searchParams.get("positionId");
    const latest = searchParams.get("latest") === "true";

    if (!candidateId) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    if (latest) {
      const screening = await getLatestCandidateAiScreening(
        candidateId,
        positionId || undefined
      );
      return NextResponse.json({ screening }, { status: 200 });
    }

    const screenings = await getCandidateAiScreenings(
      candidateId,
      positionId || undefined
    );

    return NextResponse.json({ screenings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching AI screenings", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

