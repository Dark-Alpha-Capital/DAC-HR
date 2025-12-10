import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { createTarget, getAllTargets } from "@workspace/db/queries";
import { z } from "zod";

const createTargetSchema = z.object({
  description: z.string().min(1, "Description is required"),
  timeline: z.string().min(1, "Timeline is required"),
  status: z.enum(["pending", "complete"]).default("pending"),
  createdBy: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createTargetSchema.parse(body);

    const target = await createTarget({
      description: data.description,
      status: data.status,
      timeline: new Date(data.timeline),
      createdBy: data.createdBy,
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    console.error("Error creating target:", error);
    return NextResponse.json(
      { error: "Failed to create target" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targets = await getAllTargets();
    return NextResponse.json(targets);
  } catch (error) {
    console.error("Error fetching targets:", error);
    return NextResponse.json(
      { error: "Failed to fetch targets" },
      { status: 500 }
    );
  }
}
