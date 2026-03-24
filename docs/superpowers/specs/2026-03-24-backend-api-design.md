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

**Path conventions:** All `lib/` files live at the project root (e.g. `/lib/redis.ts`). The `@/` alias maps to the project root, so imports use `@/lib/redis`, `@/lib/storage`, etc.

---

## 3. Dependencies

New packages to install (in addition to what's already present):

```
ioredis bullmq @aws-sdk/client-s3 nanoid
```

`ioredis-mock` as a dev dependency for tests.

---

## 4. Existing Files (do not recreate)

These files already exist from the UI implementation:

- `lib/prisma.ts` — Prisma singleton, imports from `@/app/generated/prisma` (NOT `@prisma/client`)
- `lib/voices.ts` — 8 ElevenLabs voice presets, exports `VOICES` array and `getVoiceById(id)`
- `lib/fonts.ts` — 8 Google Fonts, exports `STORY_FONTS` array

The `voiceId` and `fontId` validation in the POST route checks against `VOICES` and `STORY_FONTS` respectively.

---

## 5. Infrastructure Libraries

### 5.1 `lib/redis.ts`

IORedis singleton. Reads `REDIS_URL` from env. Single shared client used by both rate limiting and BullMQ.

```ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
```

### 5.2 `lib/storage.ts`

S3Client wrapper. No streaming — stories are small enough to buffer.

**Exports:**
- `uploadBuffer(bucket: string, key: string, body: Buffer, contentType: string): Promise<string>` — uploads and returns the public URL
- `deleteObject(bucket: string, key: string): Promise<void>`

Public URL format: `${S3_PUBLIC_BASE_URL}/${bucket}/${key}`

**Note on local dev:** MinIO buckets must be pre-created (via `docker-compose` minio-init service or manual setup). `lib/storage.ts` does NOT create buckets — that is a setup concern, not a runtime concern.

### 5.3 `lib/queue.ts`

BullMQ `Queue` singleton for the `story-generation` queue.

**Exports:**
- `enqueueStory(storyId: string): Promise<void>` — adds `{ storyId }` as job payload with job name `"generate"`

The worker (Spec 2) consumes from this queue.

### 5.4 `lib/rate-limit.ts`

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

## 6. API Routes

### 6.1 `POST /api/stories`

**Request body:**
```ts
{ url: string; voiceId: string; voiceName: string; fontFamily: string }
```

**Validation (zod):**
- `url`: valid HTTP/HTTPS URL
- `voiceId`: must be a known voice ID (validate against `VOICES` from `@/lib/voices`)
- `voiceName`: non-empty string (provided by frontend, paired with voiceId)
- `fontFamily`: must be a known font name (validate against `STORY_FONTS.map(f => f.name)` from `@/lib/fonts`)

**Flow:**
1. Parse + validate request body → `400` on failure
2. Extract client IP from `x-forwarded-for` header (Railway sets this). Fall back to `"127.0.0.1"` if header is absent (local dev without proxy).
3. `checkRateLimit(ip)` → `429 { error: "Rate limit exceeded", remaining: 0 }` if denied
4. `prisma.story.create({ sourceUrl: url, sourceDomain, voiceId, voiceName, fontFamily, title: "", content: "", wordCount: 0, status: "PENDING", slug: nanoid(10), ipHash, userId: session?.user?.id ?? null })`
5. `enqueueStory(story.id)`
6. Return `201 { storyId: story.id, slug: story.slug, pollUrl: \`/api/stories/status/${story.id}\` }`

**Notes:**
- No auth required — guests can generate freely
- The slug at creation is a temporary nanoid (10 chars). The worker overwrites it with a title-derived slug (e.g. `the-brave-little-robot-abc123`) once story text is generated.
- `userId` is `null` for guests

### 6.2 `GET /api/stories/status/[id]`

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

**Step numbering:** `step` runs 0–5. `totalSteps` is `5` (the final step index). Progress bar fills as `step / totalSteps`. When step === totalSteps (DONE), the bar is full.

**Response:**
```ts
{
  status: StoryStatus;
  step: number;        // 0–5; omitted when status === ERROR
  totalSteps: 5;       // always 5
  stepLabel: string;   // omitted when status === ERROR
  slug: string;        // temp nanoid until DONE, then title-derived slug
  error: string | null;
}
```

**Frontend transition:** When the polling client receives `status === "DONE"`, it navigates to `/story/${slug}`. The `slug` in the DONE response is the final title-derived slug set by the worker. No additional fetch is needed.

No auth required — guests can poll freely.

---

## 7. Error Responses

| Scenario | Status | Body |
|---|---|---|
| Invalid request body | 400 | `{ error: string }` |
| Rate limit exceeded | 429 | `{ error: "Rate limit exceeded", remaining: 0 }` |
| Story not found | 404 | `{ error: "Not found" }` |
| Unexpected server error | 500 | `{ error: "Internal server error" }` |

---

## 8. Environment Variables Used

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma / PostgreSQL connection |
| `REDIS_URL` | IORedis connection |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window (default: 5) |
| `RATE_LIMIT_WINDOW_MINUTES` | Window duration in minutes (default: 60) |
| `S3_ENDPOINT` | S3/MinIO endpoint |
| `S3_REGION` | S3 region |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |
| `S3_PUBLIC_BASE_URL` | Base URL for constructing public asset URLs |

---

## 9. Testing Strategy

Unit tests only. No integration tests against real Redis/S3 in this spec (those belong in Spec 2 where the full pipeline runs).

| Test file | What it covers |
|---|---|
| `lib/rate-limit.test.ts` | Sliding window logic: allowed, at limit, over limit, remaining count. Uses `ioredis-mock`. |
| `lib/storage.test.ts` | `uploadBuffer` calls correct S3 command, returns correct URL. `deleteObject` calls correct command. Mocks `@aws-sdk/client-s3`. |
| `lib/queue.test.ts` | `enqueueStory` calls `queue.add` with job name `"generate"` and payload `{ storyId }`. Mocks BullMQ `Queue`. |
| `app/api/stories/route.test.ts` | Valid request → 201; rate limited → 429; invalid URL → 400; missing fields → 400. Mocks `lib/rate-limit`, `lib/queue`, `lib/prisma`. |
| `app/api/stories/status/[id]/route.test.ts` | Status→step mapping for each enum value; 404 on unknown id; ERROR returns error field; DONE returns final slug. Mocks `lib/prisma`. |

---

## 10. File Map

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
| `lib/queue.test.ts` | Create | Queue unit tests |
| `app/api/stories/route.test.ts` | Create | POST route unit tests |
| `app/api/stories/status/[id]/route.test.ts` | Create | Status route unit tests |
