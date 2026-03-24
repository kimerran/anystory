import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAdd = vi.fn().mockResolvedValue({ id: "job-1" });

vi.mock("bullmq", () => {
  return {
    Queue: vi.fn(function() {
      this.add = mockAdd;
    }),
  };
});

vi.mock("@/lib/redis", () => ({
  redis: {},
}));

beforeEach(() => {
  mockAdd.mockClear();
});

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
