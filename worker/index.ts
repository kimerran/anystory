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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const worker = (Worker as any)(
  "story-generation",
  async (job: Job<{ storyId: string }>) => {
    const { storyId } = job.data;

    try {
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
      throw err;
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
