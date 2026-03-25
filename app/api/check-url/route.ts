import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ url: z.string().url() });

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reachable: false, reason: "Invalid request" }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ reachable: false, reason: "Invalid URL" }, { status: 400 });
  }

  const { url } = result.data;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AnyStory/1.0)" },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (res.status === 404) {
      return NextResponse.json({ reachable: false, reason: "Page not found (404)" });
    }
    if (res.status === 403 || res.status === 401) {
      return NextResponse.json({ reachable: false, reason: "This page blocks automated access — it may require login" });
    }
    if (res.status >= 500) {
      return NextResponse.json({ reachable: false, reason: "The website is having issues right now" });
    }

    return NextResponse.json({ reachable: true });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ reachable: false, reason: "URL took too long to respond" });
    }
    return NextResponse.json({ reachable: false, reason: "Can't reach this URL — check the address and try again" });
  }
}
