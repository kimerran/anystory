import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_MAP: Record<string, { step: number; stepLabel: string }> = {
  PENDING:      { step: 0, stepLabel: "Queued" },
  SCRAPING:     { step: 1, stepLabel: "Scraping website" },
  WRITING:      { step: 2, stepLabel: "Writing your story" },
  ILLUSTRATING: { step: 3, stepLabel: "Painting the illustration" },
  NARRATING:    { step: 4, stepLabel: "Recording narration" },
  DONE:         { step: 5, stepLabel: "Complete" },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const story = await prisma.story.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, errorMessage: true },
  });

  if (!story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (story.status === "ERROR") {
    return NextResponse.json({
      status: "ERROR",
      totalSteps: 5,
      slug: story.slug,
      storyUrl: null,
      error: story.errorMessage ?? "Generation failed",
    });
  }

  const { step, stepLabel } = STATUS_MAP[story.status] ?? { step: 0, stepLabel: "Queued" };

  return NextResponse.json({
    status: story.status,
    step,
    totalSteps: 5,
    stepLabel,
    slug: story.slug,
    storyUrl: null,
    error: null,
  });
}
