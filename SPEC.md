# AnyStory — Children's Quick Story Generator
## Full-Stack Application Specification

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack & Versions](#3-tech-stack--versions)
4. [Third-Party Services](#4-third-party-services)
5. [Database Schema (Prisma + PostgreSQL + pgvector)](#5-database-schema)
6. [Environment Variables](#6-environment-variables)
7. [Docker Compose (Development)](#7-docker-compose-development)
8. [Pages & UI Specification](#8-pages--ui-specification)
9. [API Endpoints](#9-api-endpoints)
10. [Authentication](#10-authentication)
11. [File Storage](#11-file-storage)
12. [Background Jobs / Queue](#12-background-jobs--queue)
13. [Seed Script](#13-seed-script)
14. [Deployment (Railway)](#14-deployment-railway)
15. [Security Best Practices](#15-security-best-practices)
16. [Error Handling](#16-error-handling)

---

## 1. Application Overview

**AnyStory** is a Next.js web application that converts the content of any publicly accessible website into a short, illustrated, narrated children's story.

### Core User Flow

```
User enters a URL
  → Firecrawl scrapes the page content
  → Anthropic Claude Sonnet generates a 100-word children's story + title
  → Fal AI Flux-2-Pro generates a full-page illustration
  → ElevenLabs TTS generates a narration audio file
  → Story is displayed on a beautifully styled one-page story card
  → Story is persisted so it can be revisited via a shareable link
```

### Key Features

- URL-to-story generation (scraping via Firecrawl)
- AI-generated story + title (Claude Sonnet)
- AI-generated illustration (Fal AI Flux-2-Pro)
- Audio narration with voice selection (ElevenLabs)
- Font selection from a curated children-friendly library
- Shareable story pages (public slug)
- Admin dashboard to view/delete all generated stories
- Story history per session (no user accounts for public users)

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                    │
│   Next.js App Router (RSC + Client Components)          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│                   NEXT.JS SERVER                         │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │  App Router   │  │   API Routes    │  │  Auth     │  │
│  │  (RSC Pages) │  │  /api/*         │  │  (NextAuth│  │
│  └──────────────┘  └────────┬────────┘  └───────────┘  │
└───────────────────────────┬─┴───────────────────────────┘
                            │
         ┌──────────────────┼──────────────────────┐
         │                  │                       │
┌────────▼──────┐  ┌────────▼──────┐  ┌────────────▼──────┐
│  PostgreSQL   │  │  MinIO/Railway │  │   Redis (BullMQ)  │
│  (Prisma ORM) │  │  File Storage  │  │   Job Queue       │
│  + pgvector   │  └───────────────┘  └───────────────────┘
└───────────────┘
         │
┌────────▼───────────────────────────────────────────────┐
│                 External Services                        │
│  ┌────────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │
│  │ Firecrawl  │ │Anthropic │ │ Fal AI │ │ElevenLabs │  │
│  │    API     │ │  Claude  │ │Flux-2  │ │   TTS     │  │
│  └────────────┘ └──────────┘ └────────┘ └───────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack & Versions

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | `15.x` (App Router) |
| Language | TypeScript | `5.x` |
| Runtime | Node.js | `22.x LTS` |
| Package Manager | pnpm | `9.x` |
| ORM | Prisma | `6.x` |
| Database | PostgreSQL | `16.x` |
| Vector Extension | pgvector | `0.7.x` |
| Auth | NextAuth.js | `5.x (Auth.js)` |
| CSS Framework | Tailwind CSS | `4.x` |
| Component Library | shadcn/ui | latest |
| Queue | BullMQ | `5.x` |
| Cache/Queue Broker | Redis (ioredis) | `7.x` |
| File Storage Client | @aws-sdk/client-s3 | `3.x` |
| HTTP Client | ky | `1.x` |
| Validation | zod | `3.x` |
| Form Handling | react-hook-form | `7.x` |
| Animations | framer-motion | `11.x` |
| Testing | Vitest + Playwright | latest |
| Linting | ESLint + Prettier | latest |
| Containerization | Docker + Docker Compose | latest |

### Key Dependencies (package.json excerpt)

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "@prisma/client": "^6.0.0",
    "prisma": "^6.0.0",
    "next-auth": "^5.0.0",
    "@auth/prisma-adapter": "^2.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/typography": "^0.5.0",
    "zod": "^3.24.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "bullmq": "^5.0.0",
    "ioredis": "^5.4.0",
    "@aws-sdk/client-s3": "^3.700.0",
    "@aws-sdk/s3-request-presigner": "^3.700.0",
    "ky": "^1.7.0",
    "framer-motion": "^11.0.0",
    "@fal-ai/client": "^1.0.0",
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.34.0",
    "nanoid": "^5.0.0",
    "slugify": "^1.6.0",
    "bcryptjs": "^2.4.3",
    "pg": "^8.13.0",
    "pgvector": "^0.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/bcryptjs": "^2.4.6",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.49.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0"
  }
}
```

---

## 4. Third-Party Services

### 4.1 Firecrawl API

- **Purpose:** Scrape and extract markdown/text content from any public URL
- **SDK:** REST API via `ky`
- **Endpoint:** `https://api.firecrawl.dev/v1/scrape`
- **Payload:**
  ```json
  {
    "url": "<user-provided-url>",
    "formats": ["markdown"],
    "onlyMainContent": true,
    "timeout": 30000
  }
  ```
- **Response fields used:** `data.markdown`, `data.metadata.title`
- **Content limit:** Truncate to first 4,000 characters to control prompt token size
- **Error handling:** If scraping fails (private/bot-blocked site), return user-friendly error message

### 4.2 Anthropic Claude Sonnet

- **Purpose:** Generate children's story (100 words) + title
- **SDK:** `@anthropic-ai/sdk`
- **Model:** `claude-sonnet-4-5` (latest Sonnet)
- **Max tokens:** `500`
- **System prompt:**
  ```
  You are a friendly children's story author. You write short, imaginative, age-appropriate stories 
  (ages 4–8) with simple vocabulary, vivid imagery, and a positive moral or message. 
  Always respond with valid JSON only.
  ```
- **User prompt template:**
  ```
  Create a 100-word children's story using elements from the content below. 
  The story must have a clear beginning, middle, and end.
  Respond ONLY with a JSON object in this exact format:
  {
    "title": "<story title>",
    "story": "<exactly 100 words of story text>"
  }

  Website content:
  <FIRECRAWL_MARKDOWN_CONTENT>
  ```
- **Response parsing:** Parse JSON from response; validate with Zod schema

### 4.3 Fal AI (Flux-2-Pro Image Generation)

- **Purpose:** Generate a children's book page illustration
- **SDK:** `@fal-ai/client`
- **Model:** `fal-ai/flux-pro/v1.1-ultra` (Flux 1.1 Pro Ultra — highest quality)
- **Image size:** `portrait_4_3` (768×1024)
- **Prompt template:**
  ```
  Children's book full-page illustration in a warm, colorful, whimsical style. 
  Soft watercolor textures, friendly characters, bright pastel colors, storybook aesthetic.
  Scene: <THE_100_WORD_STORY_TEXT>
  Style: Pixar-inspired, safe for children, no text in image, hand-painted feel.
  ```
- **Negative prompt:** `text, letters, words, watermark, adult content, dark themes, violence, realistic photography`
- **Response:** Image URL (download and store in MinIO/Railway file storage)
- **Timeout:** 120 seconds

### 4.4 ElevenLabs TTS

- **Purpose:** Generate narration audio from story text
- **SDK:** REST API via `ky`
- **Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/<voice_id>`
- **Model:** `eleven_turbo_v2_5`
- **Output format:** `mp3_44100_128`
- **Voice selection:** User picks from a curated list (seeded in DB or config). Default list:

  | Voice ID | Name | Character |
  |---|---|---|
  | `21m00Tcm4TlvDq8ikWAM` | Rachel | Warm, calm storyteller |
  | `AZnzlk1XvdvUeBnXmlld` | Domi | Energetic, playful |
  | `EXAVITQu4vr4xnSDxMaL` | Bella | Soft, gentle |
  | `ErXwobaYiN019PkySvjV` | Antoni | Friendly, expressive |
  | `MF3mGyEYCl7XYWbV9V6O` | Elli | Sweet, child-friendly |
  | `TxGEqnHWrfWFTfGW9XjX` | Josh | Warm, fatherly narrator |
  | `VR6AewLTigWG4xSOukaG` | Arnold | Deep, adventurous |
  | `pNInz6obpgDQGcFmaJgB` | Adam | Clear, trustworthy |

- **Request body:**
  ```json
  {
    "text": "<story_text>",
    "model_id": "eleven_turbo_v2_5",
    "voice_settings": {
      "stability": 0.6,
      "similarity_boost": 0.85,
      "style": 0.3,
      "use_speaker_boost": true
    }
  }
  ```
- **Response:** Binary MP3 buffer → save to file storage → return public URL

### 4.5 MinIO (Local Dev) / Railway Volume (Production)

- **Purpose:** Store generated images and audio files
- **Interface:** S3-compatible API via `@aws-sdk/client-s3`
- **Buckets:**
  - `anystory-images` — generated illustrations (PNG/JPEG)
  - `anystory-audio` — generated narration (MP3)
- **File naming:** `<storyId>/<nanoid()>.<ext>`
- **Access:** Pre-signed URLs for public read (1-year expiry for generated assets)

---

## 5. Database Schema

### 5.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

// ─── Auth ────────────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  role          Role      @default(ADMIN)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]

  @@map("users")
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires      DateTime
  sessionToken String   @unique
  createdAt    DateTime @default(now())

  @@map("sessions")
}

enum Role {
  ADMIN
}

// ─── Stories ─────────────────────────────────────────────────────────────────

model Story {
  id            String        @id @default(cuid())
  slug          String        @unique
  sourceUrl     String
  sourceDomain  String
  title         String
  content       String
  wordCount     Int
  imageUrl      String?
  audioUrl      String?
  voiceId       String
  voiceName     String
  fontFamily    String
  status        StoryStatus   @default(PENDING)
  errorMessage  String?
  ipHash        String?       // hashed requester IP for rate limiting
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // pgvector embedding for semantic search/deduplication
  embedding     Unsupported("vector(1536)")?

  @@index([slug])
  @@index([sourceUrl])
  @@index([createdAt])
  @@map("stories")
}

enum StoryStatus {
  PENDING
  SCRAPING
  GENERATING_STORY
  GENERATING_IMAGE
  GENERATING_AUDIO
  COMPLETED
  FAILED
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

model RateLimit {
  id        String   @id @default(cuid())
  key       String   @unique  // e.g. "ip:<hashed_ip>"
  count     Int      @default(1)
  windowEnd DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([key])
  @@index([windowEnd])
  @@map("rate_limits")
}

// ─── Job Audit Log ────────────────────────────────────────────────────────────

model JobLog {
  id        String   @id @default(cuid())
  storyId   String
  jobName   String
  status    String   // 'started' | 'completed' | 'failed'
  duration  Int?     // ms
  error     String?
  createdAt DateTime @default(now())

  @@index([storyId])
  @@map("job_logs")
}
```

### 5.2 pgvector Index (raw SQL migration)

```sql
-- prisma/migrations/0001_pgvector_index/migration.sql
CREATE INDEX stories_embedding_idx 
ON stories 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

---

## 6. Environment Variables

### `.env` (development — copy to `.env.local` for local Next.js)

```env
# ─── App ─────────────────────────────────────────────────────────────────────
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_32_char_random_secret

# ─── Database ────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://anystory:anystory_pass@localhost:5432/anystory_db

# ─── Redis ───────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── File Storage (MinIO local / Railway S3 prod) ────────────────────────────
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_IMAGES=anystory-images
S3_BUCKET_AUDIO=anystory-audio
S3_PUBLIC_BASE_URL=http://localhost:9000

# ─── External APIs ───────────────────────────────────────────────────────────
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
FAL_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ─── Rate Limiting ───────────────────────────────────────────────────────────
RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_WINDOW_MINUTES=60

# ─── Admin Seed ──────────────────────────────────────────────────────────────
SEED_ADMIN_EMAIL=admin@anystory.app
SEED_ADMIN_PASSWORD=ChangeMe!2025
SEED_ADMIN_NAME=AnyStory Admin
```

### `.env.production` (Railway)

```env
NODE_ENV=production
NEXTAUTH_URL=https://anystory.railway.app
NEXTAUTH_SECRET=<generated_secret>
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
S3_ENDPOINT=https://<railway-volume-or-external-s3>
S3_REGION=us-east-1
S3_ACCESS_KEY=<prod_key>
S3_SECRET_KEY=<prod_secret>
S3_BUCKET_IMAGES=anystory-images
S3_BUCKET_AUDIO=anystory-audio
S3_PUBLIC_BASE_URL=https://<bucket-cdn-url>
FIRECRAWL_API_KEY=fc-xxxx
ANTHROPIC_API_KEY=sk-ant-xxxx
FAL_KEY=xxxx
ELEVENLABS_API_KEY=xxxx
RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_WINDOW_MINUTES=60
```

---

## 7. Docker Compose (Development)

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: anystory_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: anystory
      POSTGRES_PASSWORD: anystory_pass
      POSTGRES_DB: anystory_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U anystory -d anystory_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: anystory_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: anystory_minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MinIO bucket initialization
  minio-init:
    image: minio/mc:latest
    container_name: anystory_minio_init
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
        mc alias set local http://minio:9000 minioadmin minioadmin;
        mc mb --ignore-existing local/anystory-images;
        mc mb --ignore-existing local/anystory-audio;
        mc anonymous set public local/anystory-images;
        mc anonymous set public local/anystory-audio;
        exit 0;
      "

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### `docker-compose.override.yml` (optional local dev hot-reload)

```yaml
version: "3.9"
services:
  postgres:
    ports:
      - "5432:5432"
  redis:
    ports:
      - "6379:6379"
  minio:
    ports:
      - "9000:9000"
      - "9001:9001"
```

---

## 8. Pages & UI Specification

### 8.1 File Structure

```
app/
├── (public)/
│   ├── page.tsx                    # Home / Story Generator
│   ├── story/
│   │   └── [slug]/
│   │       └── page.tsx            # Public story display page
│   └── layout.tsx
├── (admin)/
│   ├── layout.tsx                  # Admin layout with sidebar
│   ├── admin/
│   │   ├── page.tsx                # Admin dashboard / story list
│   │   └── stories/
│   │       └── [id]/
│   │           └── page.tsx        # Admin story detail
│   └── login/
│       └── page.tsx                # Admin login
├── api/
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts            # NextAuth handler
│   ├── stories/
│   │   ├── route.ts                # POST /api/stories (create)
│   │   └── [id]/
│   │       └── route.ts            # GET, DELETE /api/stories/[id]
│   ├── stories/
│   │   └── status/
│   │       └── [id]/
│   │           └── route.ts        # GET /api/stories/status/[id] (polling)
│   └── admin/
│       └── stories/
│           └── route.ts            # GET (list all), DELETE
└── layout.tsx
```

### 8.2 Home Page (`/`)

**Purpose:** Main entry point for story generation.

**Layout:**
- Full-viewport hero with animated background (floating book pages or stars)
- Centered card with:
  - App logo + tagline: *"Turn any website into a bedtime story"*
  - URL input field (large, prominent)
  - Voice selector dropdown (show voice name + character description)
  - Font selector (preview text rendered in each font)
  - "Generate Story" CTA button
- Recent public stories grid below (last 6, card layout with thumbnail + title)
- Footer with credits

**Fonts available (Tailwind custom font config):**

| Font Name | Google Fonts slug | Character |
|---|---|---|
| Bubblegum Sans | `Bubblegum+Sans` | Playful, bouncy |
| Patrick Hand | `Patrick+Hand` | Handwritten, friendly |
| Fredoka | `Fredoka` | Round, soft |
| Baloo 2 | `Baloo+2` | Friendly, modern |
| Schoolbell | `Schoolbell` | Chalkboard feel |
| Short Stack | `Short+Stack` | Comic-like |
| Sniglet | `Sniglet` | Soft, rounded |
| Chewy | `Chewy` | Bold, fun |

**Voice Selector UI:**
- Dropdown or card-grid of voice options
- Each card shows: Voice Name, Character description (e.g., "Warm storyteller"), play preview button (if available)

**State machine:**
- `idle` → URL entered → `submitting`
- Poll `/api/stories/status/[id]` every 2 seconds
- Show step-by-step progress:
  1. 🔍 Scraping website...
  2. ✍️ Writing your story...
  3. 🎨 Painting the illustration...
  4. 🎙️ Recording narration...
  5. ✨ Almost ready!
- On completion → redirect to `/story/[slug]`
- On error → show inline error with retry option

### 8.3 Story Page (`/story/[slug]`)

**Purpose:** Display the full generated story.

**Layout (single-page storybook card):**

```
┌─────────────────────────────────────────┐
│                                         │
│   [AI Generated Illustration]           │
│        Full width, ~60vh tall           │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│   [STORY TITLE]                         │
│   (large, selected font)                │
│                                         │
│   [Story text — 100 words]              │
│   (body, selected font)                 │
│                                         │
│   ┌───────────────────────────────┐     │
│   │ 🎙️ Audio Player              │     │
│   │ ▶ ━━━━━━━━━━━━○━━━ 0:00/0:32│     │
│   └───────────────────────────────┘     │
│                                         │
│   Source: [domain.com]                  │
│   [🔗 Share] [📋 Copy Link]            │
│   [← Generate Another]                  │
│                                         │
└─────────────────────────────────────────┘
```

**Page metadata:**
- `<title>` → Story title
- `<meta name="description">` → First 160 chars of story
- Open Graph image → generated illustration
- Twitter card → `summary_large_image`

**Audio Player:**
- Custom styled HTML5 `<audio>` player
- Play/pause, progress bar, time display
- Auto-play off by default (accessibility)
- Download button for MP3

**Share features:**
- Copy link to clipboard
- Native Web Share API on mobile
- No social login required

### 8.4 Admin Login (`/admin/login`)

- Simple centered login form
- Email + Password fields
- "Sign In" button
- Error toast on invalid credentials
- Redirect to `/admin` on success
- No "register" or "forgot password" (admin only, seeded)

### 8.5 Admin Dashboard (`/admin`)

**Protected route** — redirects to `/admin/login` if unauthenticated.

**Layout:**
- Sidebar navigation: Dashboard, Stories, Settings (future)
- Main content area

**Stories Table:**

| Column | Details |
|---|---|
| Thumbnail | Small image (40x40) |
| Title | Story title, link to story page |
| Source URL | Truncated domain |
| Status | Badge: PENDING / COMPLETED / FAILED |
| Voice | Voice name used |
| Created | Relative timestamp |
| Actions | View (external link), Delete |

**Features:**
- Pagination (20 per page)
- Filter by status
- Search by title or source URL
- Bulk delete
- Stats bar: Total stories, Completed, Failed, Today's count

---

## 9. API Endpoints

### 9.1 `POST /api/stories`

**Purpose:** Initiate story generation pipeline.

**Auth:** None (public, rate-limited by IP)

**Request Body:**
```json
{
  "url": "https://example.com/some-article",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "voiceName": "Rachel",
  "fontFamily": "Fredoka"
}
```

**Validation (Zod):**
```typescript
const CreateStorySchema = z.object({
  url: z.string().url().max(2048),
  voiceId: z.string().min(1).max(100),
  voiceName: z.string().min(1).max(50),
  fontFamily: z.enum([
    "Bubblegum Sans", "Patrick Hand", "Fredoka", "Baloo 2",
    "Schoolbell", "Short Stack", "Sniglet", "Chewy"
  ])
});
```

**Process:**
1. Validate input
2. Check IP rate limit (max 5 requests per 60 minutes)
3. Create Story record (status: `PENDING`)
4. Enqueue BullMQ job `generate-story` with storyId
5. Return `{ storyId, slug }` immediately (202 Accepted)

**Response (202):**
```json
{
  "storyId": "cld...",
  "slug": "the-magical-forest-abc123",
  "pollUrl": "/api/stories/status/cld..."
}
```

**Error responses:**
- `400` — invalid URL or params
- `422` — URL unreachable / unsupported
- `429` — rate limit exceeded (`Retry-After` header)
- `500` — internal error

---

### 9.2 `GET /api/stories/status/[id]`

**Purpose:** Long-poll endpoint for generation progress.

**Auth:** None

**Response:**
```json
{
  "id": "cld...",
  "slug": "the-magical-forest-abc123",
  "status": "GENERATING_IMAGE",
  "step": 3,
  "totalSteps": 4,
  "stepLabel": "Painting the illustration...",
  "error": null,
  "completedAt": null,
  "storyUrl": null
}
```

When completed:
```json
{
  "status": "COMPLETED",
  "storyUrl": "/story/the-magical-forest-abc123",
  ...
}
```

---

### 9.3 `GET /api/stories/[id]`

**Purpose:** Fetch full story data.

**Auth:** None (public stories)

**Response:**
```json
{
  "id": "cld...",
  "slug": "the-magical-forest-abc123",
  "title": "The Magical Forest Friends",
  "content": "Once upon a time...",
  "imageUrl": "https://storage.../image.jpg",
  "audioUrl": "https://storage.../audio.mp3",
  "fontFamily": "Fredoka",
  "voiceName": "Rachel",
  "sourceDomain": "nationalgeographic.com",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

### 9.4 `DELETE /api/stories/[id]`

**Purpose:** Delete a story (admin only).

**Auth:** Required (NextAuth session)

**Response:** `204 No Content`

**Side effects:** Delete image + audio files from storage.

---

### 9.5 `GET /api/admin/stories`

**Purpose:** List all stories with pagination/filter.

**Auth:** Required

**Query params:** `?page=1&limit=20&status=COMPLETED&search=forest`

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

---

## 10. Authentication

### Implementation: NextAuth.js v5 (Auth.js) with Credentials Provider

**File:** `auth.ts` (root level)

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 }, // 24 hours
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
```

**Middleware (`middleware.ts`):**
```typescript
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

---

## 11. File Storage

### Storage Service (`lib/storage.ts`)

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO
});

export async function uploadBuffer(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: "public-read",
  }));
  return `${process.env.S3_PUBLIC_BASE_URL}/${bucket}/${key}`;
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
```

---

## 12. Background Jobs / Queue

### BullMQ Worker (`workers/story-generator.ts`)

**Queue name:** `story-generation`

**Job flow (single job, sequential steps):**

```typescript
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { scrapeUrl } from "@/lib/firecrawl";
import { generateStory } from "@/lib/anthropic";
import { generateImage } from "@/lib/fal";
import { generateAudio } from "@/lib/elevenlabs";
import { uploadBuffer } from "@/lib/storage";
import { nanoid } from "nanoid";

const worker = new Worker(
  "story-generation",
  async (job: Job<{ storyId: string }>) => {
    const { storyId } = job.data;

    const story = await prisma.story.findUniqueOrThrow({
      where: { id: storyId },
    });

    try {
      // Step 1: Scrape
      await updateStatus(storyId, "SCRAPING");
      const { markdown } = await scrapeUrl(story.sourceUrl);
      const truncated = markdown.slice(0, 4000);

      // Step 2: Generate story
      await updateStatus(storyId, "GENERATING_STORY");
      const { title, content } = await generateStory(truncated);

      // Step 3: Generate image
      await updateStatus(storyId, "GENERATING_IMAGE");
      const imageBuffer = await generateImage(content);
      const imageKey = `${storyId}/${nanoid()}.jpg`;
      const imageUrl = await uploadBuffer(
        process.env.S3_BUCKET_IMAGES!,
        imageKey,
        imageBuffer,
        "image/jpeg"
      );

      // Step 4: Generate audio
      await updateStatus(storyId, "GENERATING_AUDIO");
      const audioBuffer = await generateAudio(content, story.voiceId);
      const audioKey = `${storyId}/${nanoid()}.mp3`;
      const audioUrl = await uploadBuffer(
        process.env.S3_BUCKET_AUDIO!,
        audioKey,
        audioBuffer,
        "audio/mpeg"
      );

      // Step 5: Finalize
      await prisma.story.update({
        where: { id: storyId },
        data: {
          title,
          content,
          wordCount: content.split(/\s+/).length,
          imageUrl,
          audioUrl,
          status: "COMPLETED",
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.story.update({
        where: { id: storyId },
        data: { status: "FAILED", errorMessage: message },
      });
      throw err; // BullMQ will handle retries
    }
  },
  {
    connection: { url: process.env.REDIS_URL },
    concurrency: 3,
    limiter: { max: 10, duration: 60_000 }, // 10 jobs per minute
  }
);

async function updateStatus(storyId: string, status: string) {
  await prisma.story.update({
    where: { id: storyId },
    data: { status: status as any },
  });
}
```

**Worker startup:** The worker runs as a separate Node.js process, started via:
```json
// package.json scripts
{
  "worker": "tsx workers/story-generator.ts",
  "worker:dev": "tsx watch workers/story-generator.ts"
}
```

**Job retry config:**
```typescript
// When enqueuing
await queue.add("generate-story", { storyId }, {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86400 },
});
```

---

## 13. Seed Script

### `prisma/seed.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@anystory.app";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2025";
  const name = process.env.SEED_ADMIN_NAME ?? "AnyStory Admin";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { email, passwordHash, name, role: "ADMIN" },
  });

  console.log(`✅ Admin user created: ${email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**`package.json` prisma config:**
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Run:** `pnpm prisma db seed`

---

## 14. Deployment (Railway)

### Services Required on Railway

| Service | Type | Notes |
|---|---|---|
| `anystory-app` | Next.js App | Web + API + Worker in one deploy |
| `anystory-postgres` | PostgreSQL 16 | With pgvector plugin |
| `anystory-redis` | Redis 7 | BullMQ broker |
| `anystory-storage` | Volume / MinIO | Or use Cloudflare R2 |

### `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --frozen-lockfile && pnpm prisma generate && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm prisma migrate deploy && pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}
```

### `Procfile` (for running worker alongside app)

```
web: node .next/standalone/server.js
worker: node workers/story-generator.js
```

> On Railway, deploy two separate services from the same repo — one pointing to `web` command, one to `worker`.

### `next.config.ts`

```typescript
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // S3/MinIO
    ],
  },
};

export default config;
```

### Health Check Endpoint (`app/api/health/route.ts`)

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
```

---

## 15. Security Best Practices

### Input Validation
- All API inputs validated with Zod before processing
- URL validation: must be `http` or `https`, no localhost/private IPs
- Blocklist: `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `169.254.x.x`, `::1`

```typescript
// lib/url-validator.ts
import { z } from "zod";

export const SafeUrlSchema = z
  .string()
  .url()
  .refine((url) => {
    const parsed = new URL(url);
    const blocked = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|::1)/;
    return !blocked.test(parsed.hostname);
  }, "Private/local URLs are not allowed");
```

### Rate Limiting
- IP-based rate limiting stored in PostgreSQL (`RateLimit` table)
- Sliding window: 5 requests per 60 minutes per IP
- IP stored as SHA-256 hash (never raw IP)
- Redis-backed for performance in production

### Authentication
- Passwords hashed with bcrypt (cost factor 12)
- JWT sessions with 24h expiry
- Secure, HttpOnly, SameSite=Strict cookies
- CSRF protection via NextAuth built-in tokens

### HTTP Security Headers (`next.config.ts`)
```typescript
headers: async () => [
  {
    source: "/(.*)",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' fonts.googleapis.com",
          "style-src 'self' 'unsafe-inline' fonts.googleapis.com fonts.gstatic.com",
          "font-src 'self' fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: https:",
          "connect-src 'self'",
        ].join("; "),
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      },
    ],
  },
],
```

### API Security
- Admin routes protected by NextAuth middleware
- No sensitive data in client-side bundles (all API keys server-side only)
- `NEXTAUTH_SECRET` minimum 32 characters, randomly generated

### Dependency Security
- `pnpm audit` run in CI/CD pipeline
- Dependabot enabled on GitHub

---

## 16. Error Handling

### Global API Error Handler (`lib/api-response.ts`)

```typescript
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: Record<string, unknown> = { error: message, status };
  if (details && process.env.NODE_ENV === "development") {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return apiError("Validation failed", 400, err.flatten());
  }
  if (err instanceof Error) {
    console.error("[API Error]", err.message, err.stack);
    return apiError("Internal server error", 500);
  }
  return apiError("Unknown error", 500);
}
```

### Client-side Error Boundary
- React Error Boundary wrapping story page
- Toast notifications via `sonner` library
- Retry logic in polling with exponential backoff (max 3 retries)

---

## Appendix A: Story Generation Slug Algorithm

```typescript
import slugify from "slugify";
import { nanoid } from "nanoid";

export function generateSlug(title: string): string {
  const base = slugify(title, { lower: true, strict: true }).slice(0, 40);
  const suffix = nanoid(8);
  return `${base}-${suffix}`;
}
```

## Appendix B: Voice Presets Config (`lib/voices.ts`)

```typescript
export const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", character: "Warm storyteller" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",   character: "Energetic & playful" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",  character: "Soft & gentle" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", character: "Friendly narrator" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli",   character: "Sweet & child-friendly" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",   character: "Warm fatherly tone" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", character: "Deep & adventurous" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",   character: "Clear & trustworthy" },
] as const;

export type VoiceId = typeof VOICES[number]["id"];
```

## Appendix C: Font Configuration (`tailwind.config.ts` excerpt)

```typescript
import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      fontFamily: {
        "bubblegum":    ["Bubblegum Sans", "cursive"],
        "patrick":      ["Patrick Hand", "cursive"],
        "fredoka":      ["Fredoka", "sans-serif"],
        "baloo":        ["Baloo 2", "cursive"],
        "schoolbell":   ["Schoolbell", "cursive"],
        "shortstack":   ["Short Stack", "cursive"],
        "sniglet":      ["Sniglet", "cursive"],
        "chewy":        ["Chewy", "cursive"],
      },
    },
  },
} satisfies Config;
```

---

*Specification version: 1.0.0 | Last updated: 2025*
