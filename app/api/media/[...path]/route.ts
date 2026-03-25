import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION ?? "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [bucket, ...keyParts] = path;
  const key = keyParts.join("/");

  try {
    const range = req.headers.get("Range");
    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(range ? { Range: range } : {}),
    });

    const upstream = await s3.send(cmd);

    const headers = new Headers();
    if (upstream.ContentType) headers.set("Content-Type", upstream.ContentType);
    if (upstream.ContentLength) headers.set("Content-Length", String(upstream.ContentLength));
    if (upstream.ContentRange) headers.set("Content-Range", upstream.ContentRange);
    if (upstream.AcceptRanges) headers.set("Accept-Ranges", upstream.AcceptRanges);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");

    const stream = upstream.Body?.transformToWebStream() ?? null;
    return new NextResponse(stream, { status: range ? 206 : 200, headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[media proxy] ${bucket}/${key} error:`, message);
    return new NextResponse(message, { status: 500 });
  }
}
