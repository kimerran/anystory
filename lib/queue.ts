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
