# Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four infrastructure lib modules and two API routes that wire the Next.js frontend to the BullMQ worker queue.

**Architecture:** Thin routes + focused lib modules. Each lib file has one responsibility. Routes validate, orchestrate, and return — no logic inline. Rate limiting uses a Redis sliding window with an atomic Lua script.

**Tech Stack:** Next.js 16 App Router, TypeScript, IORedis, BullMQ, AWS SDK v3 (S3), nanoid, zod, vitest

---

## Codebase Context

Read this before starting any task:

- `lib/prisma.ts` — Prisma singleton, import as `@/lib/prisma` → `{ prisma }`. Uses `@/app/generated/prisma/client`.
- `lib/voices.ts` — exports `VOICES: Voice[]` (each has `id`, `name`, `description`) and `getVoiceById(id)`.
- `lib/fonts.ts` — exports `STORY_FONTS: StoryFont[]` (each has `name`, `variable`, `description`, `className`). **Caution:** this file imports `next/font/google` at module scope and will crash in Vitest unless mocked. Always mock `@/lib/fonts` in route tests.
- `auth.ts` — exports `auth()` from `next-auth`. Call `await auth()` to get session (null for guests).
- All `lib/` files live at project root. The `@/` alias maps to project root.
- All dependencies are already installed: `ioredis`, `bullmq`, `@aws-sdk/client-s3`, `nanoid`, `zod`.
- Missing dev dependency: `ioredis-mock` (install in Task 1).

**Story model fields** (relevant subset):

```
id           String   (cuid)
slug         String   (unique — nanoid(10) at creation, title-slug after worker completes)
sourceUrl    String   (submitted URL)
sourceDomain String   (hostname extracted from URL)
title        String   (placeholder "" at creation, worker fills)
content      String   (placeholder "" at creation, worker fills)
wordCount    Int      (placeholder 0 at creation)
voiceId      String
voiceName    String
fontFamily   String   (font name string e.g. "Bubblegum Sans")
status       StoryStatus  (PENDING → SCRAPING → WRITING → ILLUSTRATING → NARRATING → DONE | ERROR)
errorMessage String?  (note: "errorMessage" in DB, mapped to "error" in API response)
ipHash       String?  (sha256 of request IP, stored at creation)
userId       String?
```

**What the frontend sends to POST /api/stories:**

```json
{ "url": "https://example.com", "voiceId": "21m00Tcm4TlvDq8ikWAM", "voiceName": "Rachel", "fontFamily": "Bubblegum Sans" }
```

> **Note — spec vs. reality:** The spec doc (section 6.1) lists the request body as `{ url, voiceId, fontId }`. This is incorrect — the actual frontend (`components/generator/HomeClient.tsx`) sends `{ url, voiceId, voiceName, fontFamily }`. The plan is correct; the spec has a known inaccuracy. Do not introduce `fontId` — use `fontFamily` throughout.

**What the frontend expects from GET /api/stories/status/[id]:**

```ts
{ status: string; step: number; totalSteps: number; stepLabel: string; error: string | null; storyUrl: string | null; slug: string | null }
```

Progress bar = `(step / 4) * 100`. Step values: PENDING=0, SCRAPING=1, WRITING=2, ILLUSTRATING=3, NARRATING=4, DONE=5.

---

## File Map

| File | Action |
|---|---|
| `lib/redis.ts` | Create |
| `lib/storage.ts` | Create |
| `lib/queue.ts` | Create |
| `lib/rate-limit.ts` | Create |
| `app/api/stories/route.ts` | Create |
| `app/api/stories/status/[id]/route.ts` | Create |
| `lib/redis.test.ts` | Create |
| `lib/storage.test.ts` | Create |
| `lib/queue.test.ts` | Create |
| `lib/rate-limit.test.ts` | Create |
| `app/api/stories/route.test.ts` | Create |
| `app/api/stories/status/[id]/route.test.ts` | Create |

---

## Task 1: Install ioredis-mock

**Files:** `package.json` (modified by pnpm)

- [ ] **Step 1: Install ioredis-mock as dev dependency**

```bash
cd /home/markhughneri-piertwo/work/any-story
pnpm add -D ioredis-mock
```

- [ ] **Step 2: Verify it appears in devDependencies**

```bash
grep ioredis-mock package.json
```

Expected: `"ioredis-mock": "^X.X.X"`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add ioredis-mock dev dependency for Redis unit tests"
```

---

## Task 2: lib/redis.ts — IORedis singleton

**Files:**
- Create: `lib/redis.ts`
- Create: `lib/redis.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/redis.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import RedisMock from "ioredis-mock";

// Mock ioredis with the in-memory mock so no real TCP connection is attempted
vi.mock("ioredis", () => ({ default: RedisMock }));

describe("redis singleton", () => {
  it("exports a redis client with expected methods", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const { redis } = await import("@/lib/redis");
    expect(redis).toBeDefined();
    expect(typeof redis.get).toBe("function");
    expect(typeof redis.set).toBe("function");
    expect(typeof redis.eval).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test lib/redis.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement lib/redis.ts**

Create `lib/redis.ts`:

```ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test lib/redis.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/redis.ts lib/redis.test.ts
git commit -m "feat: add IORedis singleton"
```

---

## Task 3: lib/storage.ts — S3 upload/delete

**Files:**
- Create: `lib/storage.ts`
- Create: `lib/storage.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/storage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue({});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ _input: input })),
  DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ _input: input })),
}));

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY = "minioadmin";
    process.env.S3_SECRET_KEY = "minioadmin";
    process.env.S3_PUBLIC_BASE_URL = "http://localhost:9000";
  });

  it("uploadBuffer returns correct public URL", async () => {
    const { uploadBuffer } = await import("@/lib/storage");
    const url = await uploadBuffer("anystory-images", "stories/abc.jpg", Buffer.from("data"), "image/jpeg");
    expect(url).toBe("http://localhost:9000/anystory-images/stories/abc.jpg");
  });

  it("uploadBuffer calls PutObjectCommand with correct params", async () => {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { uploadBuffer } = await import("@/lib/storage");
    await uploadBuffer("anystory-audio", "stories/abc.mp3", Buffer.from("audio"), "audio/mpeg");
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "anystory-audio",
        Key: "stories/abc.mp3",
        ContentType: "audio/mpeg",
      })
    );
  });

  it("deleteObject calls DeleteObjectCommand with correct params", async () => {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const { deleteObject } = await import("@/lib/storage");
    await deleteObject("anystory-images", "stories/abc.jpg");
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "anystory-images",
      Key: "stories/abc.jpg",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test lib/storage.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement lib/storage.ts**

Create `lib/storage.ts`:

```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // required for MinIO
});

export async function uploadBuffer(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return `${process.env.S3_PUBLIC_BASE_URL}/${bucket}/${key}`;
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test lib/storage.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/storage.test.ts
git commit -m "feat: add S3 storage helpers (upload/delete)"
```

---

## Task 4: lib/queue.ts — BullMQ enqueue helper

**Files:**
- Create: `lib/queue.ts`
- Create: `lib/queue.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/queue.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

const mockAdd = vi.fn().mockResolvedValue({ id: "job-1" });

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: mockAdd })),
}));

vi.mock("@/lib/redis", () => ({
  redis: {},
}));

describe("queue", () => {
  it("enqueueStory calls queue.add with job name 'generate' and correct payload", async () => {
    const { enqueueStory } = await import("@/lib/queue");
    await enqueueStory("story-abc123");
    expect(mockAdd).toHaveBeenCalledWith("generate", { storyId: "story-abc123" });
  });

  it("enqueueStory accepts any story id", async () => {
    const { enqueueStory } = await import("@/lib/queue");
    await enqueueStory("another-id-456");
    expect(mockAdd).toHaveBeenCalledWith("generate", { storyId: "another-id-456" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test lib/queue.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement lib/queue.ts**

Create `lib/queue.ts`:

```ts
import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

const globalForQueue = globalThis as unknown as { storyQueue: Queue };

const storyQueue =
  globalForQueue.storyQueue ??
  new Queue("story-generation", { connection: redis });

if (process.env.NODE_ENV !== "production") globalForQueue.storyQueue = storyQueue;

export async function enqueueStory(storyId: string): Promise<void> {
  await storyQueue.add("generate", { storyId });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test lib/queue.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/queue.ts lib/queue.test.ts
git commit -m "feat: add BullMQ story-generation queue helper"
```

---

## Task 5: lib/rate-limit.ts — Redis sliding window rate limiter

**Files:**
- Create: `lib/rate-limit.ts`
- Create: `lib/rate-limit.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/rate-limit.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import RedisMock from "ioredis-mock";

const mockRedis = new RedisMock();

vi.mock("@/lib/redis", () => ({ redis: mockRedis }));

describe("checkRateLimit", () => {
  beforeEach(async () => {
    await mockRedis.flushall();
    process.env.RATE_LIMIT_MAX_REQUESTS = "3";
    process.env.RATE_LIMIT_WINDOW_MINUTES = "60";
  });

  it("allows the first request", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allows request at the limit", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("denies request over the limit", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    const result = await checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("different IPs have independent limits", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    await checkRateLimit("1.2.3.4");
    const result = await checkRateLimit("5.6.7.8");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test lib/rate-limit.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement lib/rate-limit.ts**

Create `lib/rate-limit.ts`:

```ts
import { createHash } from "crypto";
import { redis } from "@/lib/redis";

// Atomic Lua: INCR key, set EXPIRE on first write, return current count
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local windowSecs = tonumber(ARGV[1])
local current = redis.call("INCR", key)
if current == 1 then
  redis.call("EXPIRE", key, windowSecs)
end
return current
`;

export async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "5", 10);
  const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES ?? "60", 10);
  const windowSecs = windowMinutes * 60;

  const hash = createHash("sha256").update(ip).digest("hex");
  const key = `ratelimit:ip:${hash}`;

  const current = (await redis.eval(RATE_LIMIT_SCRIPT, 1, key, String(windowSecs))) as number;

  const allowed = current <= limit;
  const remaining = allowed ? limit - current : 0;

  return { allowed, remaining };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test lib/rate-limit.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/rate-limit.ts lib/rate-limit.test.ts
git commit -m "feat: add Redis sliding window rate limiter"
```

---

## Task 6: POST /api/stories route

**Files:**
- Create: `app/api/stories/route.ts`
- Create: `app/api/stories/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/api/stories/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock lib/fonts FIRST — it imports next/font/google at module scope which crashes in Vitest
vi.mock("@/lib/fonts", () => ({
  STORY_FONTS: [
    { name: "Bubblegum Sans", variable: "--font-bubblegum", description: "Playful", className: "font-bubblegum" },
    { name: "Patrick Hand",   variable: "--font-patrick",   description: "Handwritten", className: "font-patrick" },
  ],
}));

vi.mock("@/lib/voices", () => ({
  VOICES: [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Warm" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",   description: "Energetic" },
  ],
}));

const mockCreate = vi.fn().mockResolvedValue({ id: "story-abc", slug: "abc1234567" });

vi.mock("@/lib/prisma", () => ({
  prisma: { story: { create: mockCreate } },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 4 }),
}));

vi.mock("@/lib/queue", () => ({
  enqueueStory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

function makeRequest(body: object, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/stories", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const VALID_BODY = {
  url: "https://example.com/article",
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  voiceName: "Rachel",
  fontFamily: "Bubblegum Sans",
};

describe("POST /api/stories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: "story-abc", slug: "abc1234567" });
  });

  it("returns 201 with storyId, slug, and pollUrl for valid request", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toMatchObject({
      storyId: "story-abc",
      slug: "abc1234567",
      pollUrl: "/api/stories/status/story-abc",
    });
  });

  it("creates story with correct field names in DB", async () => {
    const { POST } = await import("@/app/api/stories/route");
    await POST(makeRequest(VALID_BODY));
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceUrl: "https://example.com/article",
        sourceDomain: "example.com",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        voiceName: "Rachel",
        fontFamily: "Bubblegum Sans",
        status: "PENDING",
        title: "",
        content: "",
        wordCount: 0,
      }),
    });
  });

  it("stores ipHash in story", async () => {
    const { POST } = await import("@/app/api/stories/route");
    await POST(makeRequest(VALID_BODY, { "x-forwarded-for": "1.2.3.4" }));
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ipHash: expect.any(String) }),
    });
    // ipHash should be a sha256 hex string (64 chars)
    const callArg = mockCreate.mock.calls[0]![0] as { data: { ipHash: string } };
    expect(callArg.data.ipHash).toHaveLength(64);
  });

  it("returns 400 for invalid URL", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest({ ...VALID_BODY, url: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid voiceId", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest({ ...VALID_BODY, voiceId: "invalid-voice" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid fontFamily", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest({ ...VALID_BODY, fontFamily: "Comic Sans" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data).toMatchObject({ error: "Rate limit exceeded" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test app/api/stories/route.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement app/api/stories/route.ts**

Create `app/api/stories/route.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test app/api/stories/route.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
pnpm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add app/api/stories/route.ts app/api/stories/route.test.ts
git commit -m "feat: add POST /api/stories route"
```

---

## Task 7: GET /api/stories/status/[id] route

**Files:**
- Create: `app/api/stories/status/[id]/route.ts`
- Create: `app/api/stories/status/[id]/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/api/stories/status/[id]/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { story: { findUnique: mockFindUnique } },
}));

function makeStory(status: string, overrides?: object) {
  return { id: "story-abc", slug: "my-cool-story-abc1", status, errorMessage: null, ...overrides };
}

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/stories/status/${id}`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/stories/status/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when story not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("missing"), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns step=0 for PENDING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("PENDING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(0);
    expect(data.stepLabel).toBe("Queued");
    expect(data.status).toBe("PENDING");
  });

  it("returns step=1 for SCRAPING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("SCRAPING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(1);
    expect(data.stepLabel).toBe("Scraping website");
  });

  it("returns step=2 for WRITING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("WRITING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(2);
    expect(data.stepLabel).toBe("Writing your story");
  });

  it("returns step=3 for ILLUSTRATING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("ILLUSTRATING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(3);
    expect(data.stepLabel).toBe("Painting the illustration");
  });

  it("returns step=4 for NARRATING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("NARRATING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(4);
    expect(data.stepLabel).toBe("Recording narration");
  });

  it("returns step=5, correct slug, and storyUrl for DONE", async () => {
    mockFindUnique.mockResolvedValue(makeStory("DONE", { slug: "the-brave-robot-abc1" }));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(5);
    expect(data.slug).toBe("the-brave-robot-abc1");
    expect(data.status).toBe("DONE");
    // storyUrl is null — frontend navigates using data.slug directly
    expect(data.storyUrl).toBeNull();
  });

  it("returns error for ERROR status and omits step/stepLabel", async () => {
    mockFindUnique.mockResolvedValue(makeStory("ERROR", { errorMessage: "Scraping failed" }));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.status).toBe("ERROR");
    expect(data.error).toBe("Scraping failed");
    expect(data.step).toBeUndefined();
    expect(data.stepLabel).toBeUndefined();
  });

  it("includes totalSteps: 5 in all non-error responses", async () => {
    mockFindUnique.mockResolvedValue(makeStory("WRITING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.totalSteps).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test "app/api/stories/status"
```

Expected: FAIL — module not found

- [ ] **Step 3: Create the directory**

```bash
mkdir -p "/home/markhughneri-piertwo/work/any-story/app/api/stories/status/[id]"
```

- [ ] **Step 4: Implement the route**

Create `app/api/stories/status/[id]/route.ts`:

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test "app/api/stories/status"
```

Expected: PASS (9 tests)

- [ ] **Step 6: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass (no regressions)

- [ ] **Step 7: Commit**

```bash
git add "app/api/stories/status/[id]/route.ts" "app/api/stories/status/[id]/route.test.ts"
git commit -m "feat: add GET /api/stories/status/[id] polling route"
```
