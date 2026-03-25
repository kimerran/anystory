import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

const globalForQueue = globalThis as unknown as { storyQueue: Queue };

const storyQueue =
  globalForQueue.storyQueue ??
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new Queue("story-generation", { connection: redis as any });

if (process.env.NODE_ENV !== "production") globalForQueue.storyQueue = storyQueue;

export async function enqueueStory(storyId: string): Promise<void> {
  await storyQueue.add("generate", { storyId }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  });
}
