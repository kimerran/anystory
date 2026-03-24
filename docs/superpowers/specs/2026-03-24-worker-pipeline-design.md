# AnyStory — Generation Worker Pipeline Design (Spec 2)

**Date:** 2026-03-24
**Status:** Approved
**Scope:** BullMQ worker process — scrape → story → image → audio → save

---

## 1. Overview

The generation worker is a standalone Node.js process that consumes jobs from the `story-generation` BullMQ queue. It runs as a separate Railway service (`pnpm worker`) and is never imported by Next.js. Each job takes a `storyId`, runs the full pipeline, and updates the story record to `DONE` on success or `ERROR` on failure.

---

## 2. Architecture

**Approach:** Thin worker entry point + focused lib modules. `worker/index.ts` is the BullMQ harness and orchestrator. Each external API integration lives in its own `lib/` file, independently testable.

**Pipeline (sequential, restart-from-scratch on retry):**
```
BullMQ job { storyId }
  → fetch story from DB
  → SCRAPING:     lib/firecrawl.ts     scrapeUrl(sourceUrl)        → { markdown }
  → WRITING:      lib/anthropic.ts     generateStory(markdown)     → { title, story }
  → ILLUSTRATING: lib/fal.ts           generateImage(storyText)    → imageBuffer
                  lib/storage.ts       uploadBuffer(...)           → imageUrl
  → NARRATING:    lib/elevenlabs.ts    generateAudio(text, voiceId) → audioBuffer
                  lib/storage.ts       uploadBuffer(...)           → audioUrl
  → update story: title, content, wordCount, imageUrl, audioUrl, slug, status=DONE
```

---

## 3. New Files

| File | Purpose |
|---|---|
| `worker/index.ts` | BullMQ Worker entry point + orchestrator |
| `lib/firecrawl.ts` | Firecrawl scraping |
| `lib/anthropic.ts` | Claude story generation |
| `lib/fal.ts` | Fal AI image generation |
| `lib/elevenlabs.ts` | ElevenLabs audio generation |
| `lib/firecrawl.test.ts` | Firecrawl unit tests |
| `lib/anthropic.test.ts` | Anthropic unit tests |
| `lib/fal.test.ts` | Fal unit tests |
| `lib/elevenlabs.test.ts` | ElevenLabs unit tests |
| `worker/index.test.ts` | Worker orchestration tests |

**Modified files:**
| File | Change |
|---|---|
| `lib/queue.ts` | Add retry options to `enqueueStory` |
| `package.json` | Add `worker` and `worker:dev` scripts |

---

## 4. Worker Entry Point

**`worker/index.ts`**

```ts
import { Worker, Job } from "bullmq";
import { StoryStatus } from "@/app/generated/prisma/client";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { scrapeUrl } from "@/lib/firecrawl";
import { generateStory } from "@/lib/anthropic";
import { generateImage } from "@/lib/fal";
import { generateAudio } from "@/lib/elevenlabs";
import { uploadBuffer } from "@/lib/storage";
import slugify from "slugify";
import { nanoid } from "nanoid";

const worker = new Worker(
  "story-generation",
  async (job: Job<{ storyId: string }>) => {
    const { storyId } = job.data;

    try {
      // findUniqueOrThrow inside try so errors are caught and set ERROR status
      const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });

      // Step 1: Scrape
      await setStatus(storyId, StoryStatus.SCRAPING);
      const { markdown } = await scrapeUrl(story.sourceUrl);

      // Step 2: Write story
      await setStatus(storyId, StoryStatus.WRITING);
      const { title, story: storyText } = await generateStory(markdown);

      // Step 3: Illustrate
      await setStatus(storyId, StoryStatus.ILLUSTRATING);
      const imageBuffer = await generateImage(storyText);
      const imageUrl = await uploadBuffer(
        process.env.S3_BUCKET_IMAGES!,
        `${storyId}/${nanoid()}.jpg`,
        imageBuffer,
        "image/jpeg"
      );

      // Step 4: Narrate
      await setStatus(storyId, StoryStatus.NARRATING);
      const audioBuffer = await generateAudio(storyText, story.voiceId);
      const audioUrl = await uploadBuffer(
        process.env.S3_BUCKET_AUDIO!,
        `${storyId}/${nanoid()}.mp3`,
        audioBuffer,
        "audio/mpeg"
      );

      // Finalize
      const slug = slugify(title, { lower: true, strict: true }) + "-" + nanoid(6);
      await prisma.story.update({
        where: { id: storyId },
        data: {
          title,
          content: storyText,
          wordCount: storyText.split(/\s+/).filter(Boolean).length,
          imageUrl,
          audioUrl,
          slug,
          status: StoryStatus.DONE,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.story.update({
        where: { id: storyId },
        data: { status: StoryStatus.ERROR, errorMessage: message },
      });
      throw err; // BullMQ handles retries
    }
  },
  { connection: redis, concurrency: 3 }
);

async function setStatus(storyId: string, status: StoryStatus) {
  await prisma.story.update({ where: { id: storyId }, data: { status } });
}

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

export default worker;
```

**Prerequisites (from Spec 1):** The POST /api/stories route creates the story with placeholder values (`title: ""`, `content: ""`, `wordCount: 0`) before enqueuing. The worker overwrites these fields on success. On ERROR, the placeholder values remain in DB — they are never shown to users since the story page only renders `status === "DONE"` stories.

---

## 5. Library Modules

### 5.1 `lib/firecrawl.ts`

```ts
scrapeUrl(url: string): Promise<{ markdown: string }>
```

- POST `https://api.firecrawl.dev/v1/scrape` via `ky`
- Headers: `Authorization: Bearer ${FIRECRAWL_API_KEY}`
- Body: `{ url, formats: ["markdown"], onlyMainContent: true, timeout: 30000 }`
- Returns `data.markdown` truncated to 4,000 characters
- Throws `"Firecrawl: failed to scrape URL"` on non-200 or empty content

### 5.2 `lib/anthropic.ts`

```ts
generateStory(content: string): Promise<{ title: string; story: string }>
```

- Uses `@anthropic-ai/sdk` `Anthropic` client
- Model: `claude-sonnet-4-6`
- Max tokens: `500`
- System prompt: children's story author, respond with valid JSON only
- User prompt: create a 100-word story from content, respond ONLY with `{ "title": "...", "story": "..." }`
- Parses JSON from response text, validates with zod (already installed): `z.object({ title: z.string(), story: z.string() })`
- Throws `"Claude: invalid JSON response"` on parse failure

### 5.3 `lib/fal.ts`

```ts
generateImage(storyText: string): Promise<Buffer>
```

- Uses `@fal-ai/client` `fal.subscribe`
- Model: `fal-ai/flux-pro/v1.1-ultra`
- Image size: `portrait_4_3`
- Prompt: children's book illustration wrapping storyText (warm, colorful, whimsical, Pixar-inspired, no text in image)
- Downloads returned image URL as Buffer via `ky(...).arrayBuffer()` → `Buffer.from(...)`
- Throws `"Fal: no image URL returned"` if response has no images

### 5.4 `lib/elevenlabs.ts`

```ts
generateAudio(text: string, voiceId: string): Promise<Buffer>
```

- POST `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}` via `ky`
- Headers: `xi-api-key: ${ELEVENLABS_API_KEY}`
- Body: `{ text, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.6, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true } }`
- Query param: `output_format=mp3_44100_128`
- Returns binary response as `Buffer.from(await res.arrayBuffer())`
- Throws `"ElevenLabs: audio generation failed"` on non-200

---

## 6. Queue Retry Config

Update `lib/queue.ts` `enqueueStory` to pass job options:

```ts
await storyQueue.add("generate", { storyId }, {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 3600 },    // keep completed jobs 1 hour
  removeOnFail: { age: 86400 },       // keep failed jobs 24 hours
});
```

**Retry behavior:** On failure the worker re-throws, BullMQ retries the full pipeline from scratch (SCRAPING → WRITING → ILLUSTRATING → NARRATING). After 3 failures, story remains `ERROR` in DB.

---

## 7. Slug Generation

After Claude returns the title:

```ts
const slug = slugify(title, { lower: true, strict: true }) + "-" + nanoid(6);
// "the-brave-little-robot-abc123"
```

This overwrites the temporary nanoid slug created at story creation time. The status polling endpoint returns the current slug, so the frontend redirect to `/story/${slug}` automatically picks up the final value once status is `DONE`.

---

## 8. Package.json Scripts

```json
{
  "worker": "tsx worker/index.ts",
  "worker:dev": "tsx watch worker/index.ts"
}
```

**Railway deployment:** Deploy worker as a separate service with start command `pnpm worker`. Shares the same env vars as the web service.

---

## 9. Error Handling

| Failure point | Behavior |
|---|---|
| DB story not found | `findUniqueOrThrow` throws → BullMQ retries |
| Firecrawl fails | Throw → story set to ERROR → BullMQ retries |
| Claude returns bad JSON | Throw → story set to ERROR → BullMQ retries |
| Fal AI timeout | Throw → story set to ERROR → BullMQ retries |
| ElevenLabs fails | Throw → story set to ERROR → BullMQ retries |
| S3 upload fails | Throw → story set to ERROR → BullMQ retries |
| All 3 retries exhausted | Story stays `ERROR`, `errorMessage` set |

**Known tech debt — orphaned S3 objects on retry:** If a job fails after uploading the image (during NARRATING), the uploaded image remains in S3. On retry, new keys are generated, leaving 1–2 orphan objects per failed attempt. Accepted for now; a future cleanup job can prune objects for `ERROR` stories.

---

## 10. Testing Strategy

Unit tests only. External APIs are mocked.

| Test file | What it covers |
|---|---|
| `lib/firecrawl.test.ts` | Correct POST params, markdown truncated to 4000 chars, throws on empty content |
| `lib/anthropic.test.ts` | Correct model/prompt, JSON parsed correctly, throws on bad JSON |
| `lib/fal.test.ts` | Correct model/size/prompt, image URL fetched as Buffer, throws on no image |
| `lib/elevenlabs.test.ts` | Correct endpoint/voice/settings, returns Buffer, throws on non-200 |
| `worker/index.test.ts` | Full orchestration: status transitions in order, correct DB final update fields, slug format, error path sets ERROR+errorMessage |

---

## 11. Environment Variables Used

| Variable | Purpose |
|---|---|
| `REDIS_URL` | BullMQ worker connection |
| `DATABASE_URL` | Prisma connection |
| `FIRECRAWL_API_KEY` | Firecrawl API auth |
| `ANTHROPIC_API_KEY` | Claude API auth |
| `FAL_KEY` | Fal AI auth (auto-read by @fal-ai/client) |
| `ELEVENLABS_API_KEY` | ElevenLabs API auth |
| `S3_BUCKET_IMAGES` | Image bucket name |
| `S3_BUCKET_AUDIO` | Audio bucket name |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_BASE_URL` | S3/MinIO connection |
