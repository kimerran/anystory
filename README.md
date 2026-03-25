# AnyStory

Turn any website into a bedtime story. Paste a URL and get an illustrated, narrated children's story in seconds — powered by Claude, fal.ai, and ElevenLabs.

## Tech Stack

- **Next.js 16** + React 19 — web app
- **Prisma** + PostgreSQL — database
- **Redis** + BullMQ — background job queue
- **Anthropic Claude** — story generation
- **fal.ai** — image generation
- **ElevenLabs** — audio narration
- **NextAuth v5** + Google OAuth — authentication

## Prerequisites

- Node.js >= 20.19
- pnpm
- PostgreSQL
- Redis
- MinIO (local) or any S3-compatible storage
  - Create two buckets before starting: `anystory-images` and `anystory-audio`
- API keys: Anthropic, fal.ai, ElevenLabs, Firecrawl, Google OAuth

## Local Setup

1. Clone the repo and install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the example env file and fill in values:

   ```bash
   cp .env.example .env
   ```

3. Apply the database schema:

   ```bash
   pnpm exec prisma migrate deploy
   ```

4. Start the web server:

   ```bash
   pnpm run dev
   ```

5. In a second terminal, start the worker (required for story generation):

   ```bash
   pnpm run worker:dev
   ```

The app is available at http://localhost:3000.

## Environment Variables

| Variable | Description | Notes |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` locally |
| `NEXTAUTH_URL` | Public URL of the app | `http://localhost:3000` locally |
| `NEXTAUTH_SECRET` | Session signing secret | Generate: `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `S3_ENDPOINT` | S3/MinIO server URL | `http://localhost:9000` for local MinIO |
| `S3_REGION` | S3 region | `us-east-1` for MinIO |
| `S3_ACCESS_KEY` | S3 access key | MinIO default: `minioadmin` |
| `S3_SECRET_KEY` | S3 secret key | MinIO default: `minioadmin` |
| `S3_BUCKET_IMAGES` | Bucket for story images | Create manually: `anystory-images` |
| `S3_BUCKET_AUDIO` | Bucket for audio files | Create manually: `anystory-audio` |
| `S3_PUBLIC_BASE_URL` | Public URL MinIO serves assets on | Same as `S3_ENDPOINT` locally; CDN URL in prod |
| `FIRECRAWL_API_KEY` | Firecrawl key for scraping source URLs | `fc-...` format |
| `ANTHROPIC_API_KEY` | Anthropic key for story generation | `sk-ant-...` format |
| `FAL_KEY` | fal.ai key for image generation | UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `ELEVENLABS_API_KEY` | ElevenLabs key for audio narration | 32-char hex string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | From Google Cloud Console |
| `RATE_LIMIT_MAX_REQUESTS` | Max API requests per window | Default: `100` |
| `RATE_LIMIT_WINDOW_MINUTES` | Rate limit window duration in minutes | Default: `60` |

## Running the Worker

The worker processes story generation jobs from the BullMQ queue. It must run alongside the web server — without it, submitted stories will queue but never complete.

```bash
# Development (auto-restarts on change)
pnpm run worker:dev

# Production
pnpm run worker
```

## Tests

```bash
pnpm test              # run all tests once
pnpm test:watch        # watch mode
pnpm test:coverage     # with coverage report
```
