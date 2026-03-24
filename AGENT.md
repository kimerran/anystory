# __AGENT.md__ — AnyStory Coding Agent Guide

> This file is the authoritative reference for any AI coding agent working on the AnyStory codebase.
> Read this entire file before writing a single line of code.

---

## 0. Agent Prime Directive

You are implementing **AnyStory**, a Next.js 15 full-stack web application that generates illustrated, narrated children's stories from website URLs. Your job is to produce **production-quality, secure, well-structured code** — not prototype code. Every file you write should be ready to ship.

**Default stance:** When in doubt, be more careful, more explicit, and more defensive. Never cut corners on security, validation, or error handling.

---

## 1. Project Initialization Checklist

Complete these steps in order before touching any feature code:

```bash
# 1. Scaffold Next.js 15 with TypeScript and App Router
pnpm create next-app@latest anystory \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \          # ← DO NOT use /src — use root app/ structure
  --import-alias "@/*"

# 2. Install all dependencies from __SPEC.md__ Section 3 in one pass
pnpm add next-auth@beta @auth/prisma-adapter \
  @prisma/client prisma \
  bullmq ioredis \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  @anthropic-ai/sdk @fal-ai/client ky \
  zod react-hook-form @hookform/resolvers \
  framer-motion bcryptjs nanoid slugify \
  sonner \
  @tailwindcss/typography

pnpm add -D @types/bcryptjs tsx vitest @playwright/test \
  prettier prettier-plugin-tailwindcss

# 3. Initialize Prisma
pnpm prisma init --datasource-provider postgresql

# 4. Start dev services
docker-compose up -d

# 5. Run migrations
pnpm prisma migrate dev --name init

# 6. Seed admin
pnpm prisma db seed
```

---

## 2. Repository Structure

Enforce this exact directory layout. Do not deviate.

```
anystory/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public route group (no auth)
│   │   ├── page.tsx              # Home / generator
│   │   ├── story/[slug]/
│   │   │   └── page.tsx          # Story display
│   │   └── layout.tsx
│   ├── (admin)/                  # Admin route group (auth-protected)
│   │   ├── layout.tsx            # Admin shell with sidebar
│   │   ├── admin/
│   │   │   ├── page.tsx          # Dashboard
│   │   │   └── stories/[id]/page.tsx
│   │   └── login/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── health/route.ts
│   │   ├── stories/
│   │   │   ├── route.ts          # POST create story
│   │   │   ├── [id]/route.ts     # GET/DELETE story
│   │   │   └── status/[id]/route.ts  # GET polling status
│   │   └── admin/
│   │       └── stories/route.ts  # Admin list/bulk-delete
│   └── layout.tsx                # Root layout (fonts, metadata)
├── components/
│   ├── ui/                       # shadcn/ui generated components
│   ├── story/                    # Story-specific components
│   │   ├── StoryCard.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── FontSelector.tsx
│   │   └── VoiceSelector.tsx
│   ├── generator/                # Home page generator components
│   │   ├── UrlForm.tsx
│   │   └── GenerationProgress.tsx
│   └── admin/                    # Admin-specific components
│       ├── StoriesTable.tsx
│       └── StatsBar.tsx
├── lib/
│   ├── prisma.ts                 # Prisma singleton
│   ├── redis.ts                  # Redis/ioredis singleton
│   ├── queue.ts                  # BullMQ queue instance
│   ├── storage.ts                # S3/MinIO client
│   ├── firecrawl.ts              # Firecrawl API wrapper
│   ├── anthropic.ts              # Claude API wrapper
│   ├── fal.ts                    # Fal AI wrapper
│   ├── elevenlabs.ts             # ElevenLabs API wrapper
│   ├── rate-limit.ts             # IP rate limiting logic
│   ├── url-validator.ts          # Safe URL validation
│   ├── api-response.ts           # Standardized API helpers
│   ├── voices.ts                 # Voice presets config
│   ├── fonts.ts                  # Font config
│   └── utils.ts                  # Generic helpers (cn, slugify, etc.)
├── workers/
│   └── story-generator.ts        # BullMQ worker (separate process)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── types/
│   └── index.ts                  # Shared TypeScript types
├── public/
│   └── fonts/                    # Any self-hosted fonts
├── .env                          # Local dev env (gitignored)
├── .env.example                  # Template (committed)
├── docker-compose.yml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── railway.json
└── Procfile
```

---

## 3. Tech Stack Rules

### 3.1 Next.js App Router

- **Always** use the App Router (`app/` directory). Never use `pages/`.
- Server Components are the **default**. Only add `"use client"` when you need:
  - React hooks (`useState`, `useEffect`, `useRef`)
  - Browser APIs
  - Event listeners
  - Animation libraries (framer-motion)
- **Never** use `getServerSideProps` or `getStaticProps` — these are Pages Router patterns.
- Use `async` Server Components for data fetching, never `useEffect` for initial data.
- Route Handlers (`route.ts`) are the API layer. Never call external APIs directly from client components.

### 3.2 TypeScript

- **Strict mode always on.** `tsconfig.json` must include:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": true
    }
  }
  ```
- No `any` types. Use `unknown` and narrow with type guards.
- All function parameters and return types must be explicitly typed.
- Use `satisfies` operator for config objects.
- Define shared types in `types/index.ts`, not inline.

### 3.3 Prisma ORM

- **One Prisma client instance.** Use the singleton pattern:
  ```typescript
  // lib/prisma.ts
  import { PrismaClient } from "@prisma/client";

  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  ```
- Never call `new PrismaClient()` anywhere else.
- Always use transactions for multi-table writes:
  ```typescript
  await prisma.$transaction([...operations]);
  ```
- Use `findUniqueOrThrow` / `findFirstOrThrow` instead of checking for null manually.
- Never expose raw Prisma models to API responses — map to DTOs.

### 3.4 API Routes

- Every route handler must:
  1. Validate input with Zod
  2. Handle errors with `try/catch`
  3. Return typed responses
  4. Use the `apiError` / `handleApiError` helpers from `lib/api-response.ts`
- Template for every route:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { z } from "zod";
  import { apiError, handleApiError } from "@/lib/api-response";

  const Schema = z.object({ /* ... */ });

  export async function POST(req: NextRequest) {
    try {
      const body = await req.json();
      const data = Schema.parse(body);
      // ... business logic
      return NextResponse.json(result, { status: 201 });
    } catch (err) {
      return handleApiError(err);
    }
  }
  ```
- **Never** return raw error messages or stack traces to clients.
- Set appropriate HTTP status codes — don't use 200 for errors.

### 3.5 BullMQ / Redis

- **One Redis instance.** Singleton pattern:
  ```typescript
  // lib/redis.ts
  import IORedis from "ioredis";
  const globalForRedis = globalThis as unknown as { redis: IORedis };
  export const redis =
    globalForRedis.redis ??
    new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
  ```
- Workers run as a **separate Node process**, not inside Next.js.
- Never import the worker file into Next.js server code.
- Jobs must have `attempts: 3` with exponential backoff.
- Log all job state changes to the `JobLog` table.

### 3.6 Tailwind CSS

- Use Tailwind utility classes exclusively. No custom CSS files except `globals.css` for base resets and font imports.
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes:
  ```typescript
  // lib/utils.ts
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- Never use inline `style` attributes except for dynamic values that can't be achieved with Tailwind (e.g., dynamic font family from user selection).
- All Google Fonts must be loaded in `app/layout.tsx` via `next/font/google`.

---

## 4. Service Integration Rules

### 4.1 Firecrawl (`lib/firecrawl.ts`)

```typescript
import ky from "ky";
import { z } from "zod";

const FirecrawlResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    markdown: z.string(),
    metadata: z.object({ title: z.string().optional() }).optional(),
  }),
});

export async function scrapeUrl(url: string): Promise<{ markdown: string; title?: string }> {
  const response = await ky.post("https://api.firecrawl.dev/v1/scrape", {
    headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
    json: { url, formats: ["markdown"], onlyMainContent: true, timeout: 30000 },
    timeout: 35000,
  }).json();

  const parsed = FirecrawlResponseSchema.parse(response);

  if (!parsed.success) throw new Error("Firecrawl scraping failed");

  return {
    markdown: parsed.data.markdown.slice(0, 4000), // hard cap
    title: parsed.data.metadata?.title,
  };
}
```

**Rules:**
- Always cap scraped content at 4,000 characters.
- Wrap in try/catch at the call site.
- If Firecrawl returns empty content, throw a user-friendly error.

### 4.2 Anthropic Claude (`lib/anthropic.ts`)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const StoryResponseSchema = z.object({
  title: z.string().min(1).max(100),
  story: z.string().min(50).max(600),
});

export async function generateStory(content: string) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: `You are a friendly children's story author. You write short, imaginative, 
age-appropriate stories (ages 4–8) with simple vocabulary, vivid imagery, and a positive 
moral or message. Always respond with valid JSON only — no markdown, no explanation.`,
    messages: [{
      role: "user",
      content: `Create a 100-word children's story using elements from the content below.
The story must have a clear beginning, middle, and end.
Respond ONLY with a JSON object:
{"title": "<story title>", "story": "<exactly 100 words>"}

Website content:
${content}`,
    }],
  });

  const text = message.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  return StoryResponseSchema.parse(JSON.parse(text));
}
```

**Rules:**
- Always parse the response JSON with Zod — never trust raw Claude output.
- If JSON parsing fails, retry once with a stricter prompt; then throw.
- Never log or store `ANTHROPIC_API_KEY` anywhere.

### 4.3 Fal AI (`lib/fal.ts`)

```typescript
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

export async function generateImage(storyText: string): Promise<Buffer> {
  const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
    input: {
      prompt: `Children's book full-page illustration in a warm, colorful, whimsical style.
Soft watercolor textures, friendly characters, bright pastel colors, storybook aesthetic.
Scene: ${storyText}
Style: Pixar-inspired, safe for children, no text or letters in image, hand-painted feel.`,
      negative_prompt: "text, letters, words, watermark, adult content, dark themes, violence, realistic photography, blurry",
      image_size: "portrait_4_3",
      num_images: 1,
      enable_safety_checker: true,
    },
    pollInterval: 3000,
    timeout: 120_000,
  });

  const imageUrl = (result as any).images?.[0]?.url;
  if (!imageUrl) throw new Error("Fal AI returned no image");

  // Download image and return buffer
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Failed to download generated image");
  return Buffer.from(await response.arrayBuffer());
}
```

**Rules:**
- Always enable the safety checker (`enable_safety_checker: true`).
- Download the image immediately and store in our own storage — never use Fal's URL as the permanent URL (it expires).
- Handle timeout gracefully with a clear error message.

### 4.4 ElevenLabs (`lib/elevenlabs.ts`)

```typescript
import ky from "ky";

export async function generateAudio(text: string, voiceId: string): Promise<Buffer> {
  const response = await ky.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      json: {
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.85,
          style: 0.3,
          use_speaker_boost: true,
        },
      },
      timeout: 60_000,
    }
  );

  return Buffer.from(await response.arrayBuffer());
}
```

**Rules:**
- Always validate `voiceId` against the `VOICES` list in `lib/voices.ts` before calling.
- Store the audio buffer immediately in file storage.
- Cap text at 500 characters for TTS to avoid excessive costs.

---

## 5. Security Rules (Non-Negotiable)

### 5.1 Environment Variables

- **All** API keys (`ANTHROPIC_API_KEY`, `FAL_KEY`, `ELEVENLABS_API_KEY`, `FIRECRAWL_API_KEY`) are **server-only**.
- Never prefix them with `NEXT_PUBLIC_` — doing so exposes them to the browser.
- Validate all required env vars at startup:
  ```typescript
  // lib/env.ts — import this in lib/prisma.ts, lib/redis.ts, etc.
  const required = [
    "DATABASE_URL", "REDIS_URL", "NEXTAUTH_SECRET",
    "ANTHROPIC_API_KEY", "FAL_KEY", "ELEVENLABS_API_KEY",
    "FIRECRAWL_API_KEY", "S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY",
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  ```

### 5.2 URL Validation (SSRF Prevention)

**Always** use the `SafeUrlSchema` from `lib/url-validator.ts` before passing any URL to Firecrawl or any HTTP client:

```typescript
import { z } from "zod";

const BLOCKED_PATTERNS = [
  /^localhost/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /^0\./,
];

export const SafeUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .max(2048, "URL too long")
  .refine((url) => {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return false;
      return !BLOCKED_PATTERNS.some(p => p.test(parsed.hostname));
    } catch {
      return false;
    }
  }, "This URL is not allowed");
```

### 5.3 Rate Limiting

Implement in `lib/rate-limit.ts`. Call in every public POST endpoint:

```typescript
export async function checkRateLimit(ipHash: string): Promise<void> {
  const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES ?? "60");
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "5");
  const windowEnd = new Date(Date.now() + windowMinutes * 60 * 1000);

  const result = await prisma.rateLimit.upsert({
    where: { key: `ip:${ipHash}` },
    update: { count: { increment: 1 } },
    create: { key: `ip:${ipHash}`, count: 1, windowEnd },
  });

  // Reset if window expired
  if (new Date() > result.windowEnd) {
    await prisma.rateLimit.update({
      where: { key: `ip:${ipHash}` },
      data: { count: 1, windowEnd },
    });
    return;
  }

  if (result.count > maxRequests) {
    throw new RateLimitError(windowEnd);
  }
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfter: Date) {
    super("Rate limit exceeded");
  }
}
```

**Extract & hash IP in route handlers:**
```typescript
import { createHash } from "crypto";
import { headers } from "next/headers";

function getHashedIp(): string {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? h.get("x-real-ip")
    ?? "unknown";
  return createHash("sha256").update(ip).digest("hex");
}
```

### 5.4 Authentication Guards

- **Never trust** client-side auth checks for data mutations.
- In every admin API route:
  ```typescript
  import { auth } from "@/auth";
  
  export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ... proceed
  }
  ```
- The `middleware.ts` handles redirect-level protection, but always double-check in API routes.

### 5.5 Content Security Policy

Add all HTTP security headers in `next.config.ts` as specified in `__SPEC.md__` Section 15. This is mandatory, not optional.

---

## 6. UI/UX Implementation Rules

### 6.1 Design Principles

- The app is for children's content — the UI should be **warm, colorful, and playful** but still professional.
- Use the **Fredoka** font as the default display font for the app shell (not the story font).
- Primary color palette: warm amber/orange tones with soft cream backgrounds.
- The story page should feel like an **actual physical children's book**.
- No dark mode required (children's book aesthetic is light and warm).

### 6.2 Loading States

**Every async action must have a loading state.** No exceptions.
- Use skeleton loaders for content areas.
- The generation progress must show real-time step updates (poll `/api/stories/status/[id]` every 2 seconds).
- Disable the "Generate Story" button immediately on submit; show spinner.

### 6.3 Error States

- Every page must handle: loading, error, and empty states.
- Errors shown in non-technical language (the end user may be a parent or child).
- Toast notifications via `sonner` for transient messages.
- Inline error messages for form validation.

### 6.4 Accessibility

- All interactive elements must have `aria-label` where the visible label is insufficient.
- Color contrast must meet WCAG AA (4.5:1 for normal text).
- Audio player must be keyboard-navigable.
- Images (AI-generated illustrations) must have descriptive `alt` text (use the story title).
- `<audio>` element must not autoplay.

### 6.5 Font Loading

Load all fonts in `app/layout.tsx` using `next/font/google`:
```typescript
import {
  Fredoka, Bubblegum_Sans, Patrick_Hand,
  Baloo_2, Schoolbell, Short_Stack, Sniglet, Chewy
} from "next/font/google";
```
Apply fonts via CSS variables, then reference in Tailwind.

---

## 7. Worker Process Rules

### 7.1 The Worker is Not Next.js

- `workers/story-generator.ts` is a **standalone Node.js process**.
- It imports from `lib/` but never from `app/`.
- Run it with `tsx` in development, compiled with `tsc` for production.
- It has its own error handling, separate from Next.js.

### 7.2 Status Updates

Update story status at the **start** of each step (optimistic UI):
```typescript
// Before starting each operation:
await prisma.story.update({ where: { id }, data: { status: "GENERATING_IMAGE" } });
// Then do the operation
```

### 7.3 Cleanup on Failure

If the job fails after partial completion (e.g., image was generated but audio failed):
- Set `status: "FAILED"` with a descriptive `errorMessage`
- **Do not** delete partial assets immediately (keep for debugging; clean up via cron or admin action)
- Log the failure to `JobLog`

---

## 8. Database Rules

### 8.1 Migrations

- **Never** manually edit migration files after they've been committed.
- Always use `prisma migrate dev --name <descriptive-name>`.
- Migration names must be descriptive: `add_story_embedding`, not `migration1`.
- After schema changes: `prisma generate` must be run before building.

### 8.2 Query Optimization

- Always include only needed fields in queries:
  ```typescript
  // ✅ Good
  prisma.story.findMany({ select: { id: true, title: true, slug: true } })
  // ❌ Bad
  prisma.story.findMany()
  ```
- Add database indexes for all fields used in `where`, `orderBy`, or `groupBy` clauses.
- Use `take` and `skip` for all list queries (pagination always required).

### 8.3 pgvector

- The `embedding` field is for future semantic search. Do not implement it in v1 unless explicitly requested, but keep the column in the schema.
- Never attempt to query the vector column without the `pgvector` extension enabled.

---

## 9. File & Asset Rules

### 9.1 Storage Keys

File keys follow this pattern — enforce it strictly:
```
{storyId}/{nanoid(10)}.{ext}
```
Example: `cld1234abcd/Xv8k9mJnQt.jpg`

### 9.2 Cleanup on Delete

When an admin deletes a story, the route handler must:
1. Fetch the story to get `imageUrl` and `audioUrl`
2. Parse the S3 key from the URL
3. Delete both objects from storage
4. Delete the DB record

Never leave orphaned files in storage.

### 9.3 File Size Limits

- Images from Fal AI: accept up to **10MB**
- Audio from ElevenLabs: accept up to **5MB**
- Reject and fail the job if limits are exceeded.

---

## 10. Code Quality Standards

### 10.1 Naming Conventions

| Pattern | Convention | Example |
|---|---|---|
| React components | PascalCase | `StoryCard.tsx` |
| Non-component files | camelCase | `apiResponse.ts` |
| API routes | lowercase | `route.ts` |
| Types/Interfaces | PascalCase | `StoryStatus` |
| Constants | SCREAMING_SNAKE | `MAX_CONTENT_LENGTH` |
| DB tables | snake_case (Prisma `@@map`) | `stories`, `job_logs` |

### 10.2 File Length

- No file > 300 lines. Break into smaller modules.
- No function > 50 lines. Extract helpers.
- No more than 3 levels of nesting in control flow. Use early returns.

### 10.3 Comments

- Comment the **why**, not the **what**.
- Every exported function must have a JSDoc comment.
- No commented-out code committed.

### 10.4 Imports

- Group imports: external libraries → internal `@/lib` → internal `@/components` → types.
- Use `@/` alias for all internal imports — never relative paths like `../../lib/prisma`.

---

## 11. Implementation Order

Implement features in this exact sequence:

### Phase 1: Foundation
1. Docker Compose setup (verified working)
2. Prisma schema + migrations + seed script
3. NextAuth credentials auth (login page + admin middleware)
4. Health check endpoint
5. Environment variable validation

### Phase 2: Core API
6. URL validation + rate limiting utilities
7. File storage client (MinIO connection verified)
8. Firecrawl integration (test with a known URL)
9. Anthropic Claude integration (test story generation)
10. Fal AI integration (test image generation)
11. ElevenLabs integration (test audio generation)

### Phase 3: Queue & Worker
12. Redis client + BullMQ queue setup
13. Worker implementation (full story pipeline)
14. `POST /api/stories` (enqueue job)
15. `GET /api/stories/status/[id]` (polling)

### Phase 4: Public UI
16. Home page — URL form + voice/font selector
17. Generation progress UI (polling + step display)
18. Story display page (`/story/[slug]`)
19. Audio player component
20. Recent stories grid

### Phase 5: Admin UI
21. Admin dashboard (story table + stats)
22. Admin story detail/delete
23. Bulk operations

### Phase 6: Polish & Hardening
24. Open Graph / Twitter Card meta tags for story pages
25. Error boundaries and fallback UIs
26. HTTP security headers
27. `pnpm audit` + fix vulnerabilities
28. Railway deployment configuration

---

## 12. Testing Checklist

Before marking any feature done, verify:

- [ ] Happy path works end-to-end
- [ ] Invalid input returns 400 with clear message
- [ ] Rate limit returns 429 with `Retry-After` header
- [ ] Unauthenticated admin routes return 401
- [ ] Story fails gracefully if Firecrawl/Claude/Fal/ElevenLabs throws
- [ ] Story deletion removes files from storage
- [ ] No API keys exposed in browser network tab
- [ ] Audio player works on mobile Safari (MP3 format)
- [ ] Story page renders correct Open Graph tags
- [ ] Worker recovers from Redis restart

---

## 13. Common Mistakes to Avoid

| ❌ Wrong | ✅ Right |
|---|---|
| `import { prisma } from "../../lib/prisma"` | `import { prisma } from "@/lib/prisma"` |
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` (server-only) |
| `new PrismaClient()` in a route | `prisma` singleton from `lib/prisma.ts` |
| Storing raw IP addresses | Store `sha256(ip)` hash |
| `response.json()` without schema | `Schema.parse(await response.json())` |
| Auto-playing audio | `<audio controls>` without `autoPlay` |
| Using Fal's temporary image URL | Download, store in MinIO, use our URL |
| Skipping error handling in worker | All steps wrapped in try/catch |
| `console.log` with sensitive data | Log only IDs and non-sensitive info |
| `any` TypeScript type | `unknown` with type guard |

---

## 14. Deployment Checklist

Before deploying to Railway:

- [ ] All env vars set in Railway dashboard (not hardcoded)
- [ ] `railway.json` present with correct build/start commands
- [ ] `Procfile` has both `web` and `worker` entries
- [ ] `next.config.ts` has `output: "standalone"`
- [ ] Health check endpoint returns 200
- [ ] `prisma migrate deploy` runs as part of start command
- [ ] pgvector extension enabled on Railway Postgres
- [ ] Both storage buckets created and set to public-read
- [ ] `NEXTAUTH_SECRET` is at least 32 random characters
- [ ] `NEXTAUTH_URL` matches the actual Railway deployment URL

---

*Agent Guide version: 1.0.0 | Paired with: __SPEC.md__ v1.0.0*
