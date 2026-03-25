import { NextRequest, NextResponse } from "next/server";

const MINIO_BASE = process.env.S3_ENDPOINT ?? "http://localhost:9000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${MINIO_BASE}/${path.join("/")}`;

  const upstreamHeaders: Record<string, string> = {};
  const range = req.headers.get("Range");
  if (range) upstreamHeaders["Range"] = range;

  const upstream = await fetch(url, { headers: upstreamHeaders });
  const body = await upstream.arrayBuffer();

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  for (const h of ["Content-Length", "Content-Range", "Accept-Ranges"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new NextResponse(body, { status: upstream.status, headers });
}
