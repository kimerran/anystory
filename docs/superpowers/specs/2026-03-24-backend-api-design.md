# AnyStory — Backend API Design (Spec 1)

**Date:** 2026-03-24
**Status:** Approved
**Scope:** API routes, rate limiting, S3 storage, and queue integration (no worker pipeline)

---

## 1. Overview

This spec covers the server-side layer that sits between the Next.js frontend and the background generation worker. It includes four infrastructure library modules and two API routes. The generation worker itself (Firecrawl → Claude → Fal → ElevenLabs) is covered in Spec 2.

---

## 2. Architecture

**Approach:** Thin routes + focused lib modules. Each `lib/` file has one responsibility and a clean interface. Routes validate, orchestrate, and return — no business logic inline.

**Rate limiting:** Redis-based sliding window (not DB table). Atomic Lua script to avoid race conditions.

**Queue:** BullMQ over Redis. The POST /api/stories route enqueues; the worker (separate Railway service) consumes.

**Storage:** AWS SDK v3 S3Client. MinIO locally, Railway S3-compatible in production.

---

## 3. Infrastructure Libraries

### 3.1 `lib/redis.ts`

IORedis singleton. Reads `REDIS_URL` from env. Single shared client used by both rate limiting and BullMQ.

```ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
```

### 3.2 `lib/storage.ts`

S3Client wrapper. No streaming — stories are small enough to buffer.

**Exports:**
- `uploadBuffer(bucket: string, key: string, body: Buffer, contentType: string): Promise<string>` — uploads and returns the public URL
- `deleteObject(bucket: string, key: string): Promise<void>`

Public URL format: `${S3_PUBLIC_BASE_URL}/${bucket}/${key}`

### 3.3 `lib/queue.ts`

BullMQ `Queue` singleton for the `story-generation` queue.

**Exports:**
- `enqueueStory(storyId: string): Promise<void>` — adds `{ storyId }` as job payload

The worker (Spec 2) consumes from this queue.

### 3.4 `lib/rate-limit.ts`

Redis sliding window rate limiter.

**Signature:**
```ts
checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }>
```

- Key format: `ratelimit:ip:{sha256(ip)}` — hashed to avoid storing raw IPs
- Window: `RATE_LIMIT_WINDOW_MINUTES` env var (default: 60)
- Limit: `RATE_LIMIT_MAX_REQUESTS` env var (default: 5)
- Uses atomic Lua script (INCR + EXPIRE) to avoid race conditions

---

## 4. API Routes

### 4.1 `POST /api/stories`

**Request body:**
```ts
{ url: string; voiceId: string; fontId: string }
```

**Validation (zod):**
- `url`: valid HTTP/HTTPS URL
- `voiceId`: must be in the known voice list (`lib/voices.ts`)
- `fontId`: must be in the known font list (`lib/fonts.ts`)

**Flow:**
1. Parse + validate request body → `400` on failure
2. Extract client IP from `x-forwarded-for` header (Railway sets this)
3. `checkRateLimit(ip)` → `429 { error: "Rate limit exceeded", remaining: 0 }` if denied
4. `db.story.create({ url, voiceId, fontId, status: "PENDING", slug: nanoid(10), userId: session?.user?.id ?? null })`
5. `enqueueStory(story.id)`
6. Return `201 { storyId: story.id, slug: story.slug, pollUrl: \`/api/stories/status/${story.id}\` }`

**Notes:**
- No auth required — guests can generate freely
- The slug at creation is a temporary nanoid (10 chars). The worker overwrites it with a title-derived slug (e.g. `the-brave-little-robot-abc123`) once story text is generated.
- `userId` is `null` for guests

### 4.2 `GET /api/stories/status/[id]`

**Flow:**
1. Fetch story by id from DB
2. Return `404 { error: "Not found" }` if missing
3. Map status → step for the 4-step progress UI:

| DB Status | step | stepLabel |
|---|---|---|
| PENDING | 0 | Queued |
| SCRAPING | 1 | Scraping website |
| WRITING | 2 | Writing your story |
| ILLUSTRATING | 3 | Painting the illustration |
| NARRATING | 4 | Recording narration |
| DONE | 5 | Complete |
| ERROR | — | (error field set) |

**Response:**
```ts
{
  status: StoryStatus;
  step: number;        // 0–5, omitted on ERROR
  totalSteps: 5;
  stepLabel: string;   // omitted on ERROR
  slug: string;        // set after DONE, temp nanoid before
  error: string | null;
}
```

No auth required — guests can poll freely.

---

## 5. Error Responses

| Scenario | Status | Body |
|---|---|---|
| Invalid request body | 400 | `{ error: string }` |
| Rate limit exceeded | 429 | `{ error: "Rate limit exceeded", remaining: 0 }` |
| Story not found | 404 | `{ error: "Not found" }` |
| Unexpected server error | 500 | `{ error: "Internal server error" }` |

---

## 6. Environment Variables Used

| Variable | Purpose |
|---|---|
| `REDIS_URL` | IORedis connection |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window (default: 5) |
| `RATE_LIMIT_WINDOW_MINUTES` | Window duration in minutes (default: 60) |
| `S3_ENDPOINT` | S3/MinIO endpoint |
| `S3_REGION` | S3 region |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |
| `S3_PUBLIC_BASE_URL` | Base URL for constructing public asset URLs |

---

## 7. Testing Strategy

Unit tests only. No integration tests against real Redis/S3 in this spec (those belong in Spec 2 where the full pipeline runs).

| Test file | What it covers |
|---|---|
| `lib/rate-limit.test.ts` | Sliding window logic: allowed, at limit, over limit, remaining count. Uses `ioredis-mock`. |
| `lib/storage.test.ts` | `uploadBuffer` calls correct S3 command, returns correct URL. `deleteObject` calls correct command. Mocks `@aws-sdk/client-s3`. |
| `app/api/stories/route.test.ts` | Valid request → 201; rate limited → 429; invalid URL → 400; missing fields → 400. Mocks `lib/rate-limit`, `lib/queue`, `lib/prisma`. |
| `app/api/stories/status/[id]/route.test.ts` | Status→step mapping for each enum value; 404 on unknown id; ERROR returns error field. Mocks `lib/prisma`. |

---

## 8. File Map

| File | Action | Purpose |
|---|---|---|
| `lib/redis.ts` | Create | IORedis singleton |
| `lib/storage.ts` | Create | S3 upload/delete helpers |
| `lib/queue.ts` | Create | BullMQ enqueue helper |
| `lib/rate-limit.ts` | Create | Redis rate limiter |
| `app/api/stories/route.ts` | Create | POST /api/stories |
| `app/api/stories/status/[id]/route.ts` | Create | GET /api/stories/status/[id] |
| `lib/rate-limit.test.ts` | Create | Rate limit unit tests |
| `lib/storage.test.ts` | Create | Storage unit tests |
| `app/api/stories/route.test.ts` | Create | POST route unit tests |
| `app/api/stories/status/[id]/route.test.ts` | Create | Status route unit tests |
