import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { enqueueStory } from "@/lib/queue";
import { VOICES } from "@/lib/voices";
import { STORY_FONTS } from "@/lib/fonts";

const validVoiceIds = VOICES.map((v) => v.id) as [string, ...string[]];
const validFontNames = STORY_FONTS.map((f) => f.name) as [string, ...string[]];

const schema = z.object({
  url: z.string().url(),
  voiceId: z.enum(validVoiceIds),
  voiceName: z.string().min(1),
  fontFamily: z.enum(validFontNames),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Parse and validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { url, voiceId, voiceName, fontFamily } = result.data;

  // Rate limiting
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : "127.0.0.1";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const { allowed } = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded", remaining: 0 }, { status: 429 });
  }

  // Get session (null for guests)
  const session = await auth();

  // Extract domain from URL
  const sourceDomain = new URL(url).hostname;

  // Create story record
  const story = await prisma.story.create({
    data: {
      slug: nanoid(10),
      sourceUrl: url,
      sourceDomain,
      title: "",
      content: "",
      wordCount: 0,
      voiceId,
      voiceName,
      fontFamily,
      status: "PENDING",
      ipHash,
      userId: session?.user?.id ?? null,
    },
  });

  // Enqueue generation job
  await enqueueStory(story.id);

  return NextResponse.json(
    {
      storyId: story.id,
      slug: story.slug,
      pollUrl: `/api/stories/status/${story.id}`,
    },
    { status: 201 }
  );
}
