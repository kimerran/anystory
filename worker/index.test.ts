import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external deps before any imports
const mockWorkerOn = vi.fn();
const mockWorkerConstructor = vi.fn();

vi.mock("bullmq", () => ({
  Worker: vi.fn(function(queueName: string, processor: any, opts: any) {
    mockWorkerConstructor(queueName, opts);
    return { on: mockWorkerOn };
  }),
}));

const mockPrismaUpdate = vi.fn().mockResolvedValue({});
const mockPrismaFindUniqueOrThrow = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    story: {
      findUniqueOrThrow: mockPrismaFindUniqueOrThrow,
      update: mockPrismaUpdate,
    },
  },
}));

vi.mock("@/lib/redis", () => ({ redis: {} }));

const mockScrapeUrl = vi.fn();
vi.mock("@/lib/firecrawl", () => ({ scrapeUrl: mockScrapeUrl }));

const mockGenerateStory = vi.fn();
vi.mock("@/lib/anthropic", () => ({ generateStory: mockGenerateStory }));

const mockGenerateImage = vi.fn();
vi.mock("@/lib/fal", () => ({ generateImage: mockGenerateImage }));

const mockGenerateAudio = vi.fn();
vi.mock("@/lib/elevenlabs", () => ({ generateAudio: mockGenerateAudio }));

const mockUploadBuffer = vi.fn();
vi.mock("@/lib/storage", () => ({ uploadBuffer: mockUploadBuffer }));

vi.mock("slugify", () => ({
  default: vi.fn().mockReturnValue("the-brave-robot"),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("abc123"),
}));

async function getProcessor() {
  const { Worker } = await import("bullmq");
  return (Worker as any).mock.calls[0][1];
}

describe("worker", () => {
  const storyId = "story-123";
  const baseStory = {
    id: storyId,
    sourceUrl: "https://example.com/article",
    voiceId: "voice-abc",
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // Re-mock after resetModules
    mockPrismaFindUniqueOrThrow.mockResolvedValue(baseStory);
    mockScrapeUrl.mockResolvedValue({ markdown: "article text" });
    mockGenerateStory.mockResolvedValue({ title: "The Brave Robot", story: "Once upon a time..." });
    mockGenerateImage.mockResolvedValue(Buffer.from("image"));
    mockUploadBuffer.mockResolvedValueOnce("https://s3.example.com/image.jpg")
                    .mockResolvedValueOnce("https://s3.example.com/audio.mp3");
    mockGenerateAudio.mockResolvedValue(Buffer.from("audio"));
    process.env.S3_BUCKET_IMAGES = "images-bucket";
    process.env.S3_BUCKET_AUDIO = "audio-bucket";
  });

  it("registers Worker on 'story-generation' queue with concurrency 3", async () => {
    await import("@/worker/index");
    const { Worker } = await import("bullmq");
    expect(Worker).toHaveBeenCalledWith(
      "story-generation",
      expect.any(Function),
      expect.objectContaining({ concurrency: 3 })
    );
  });

  it("runs full pipeline in order: SCRAPING → WRITING → ILLUSTRATING → NARRATING → DONE", async () => {
    await import("@/worker/index");
    const processor = await getProcessor();
    await processor({ data: { storyId } });

    const statusCalls = mockPrismaUpdate.mock.calls
      .filter((call: any[]) => call[0].data.status)
      .map((call: any[]) => call[0].data.status);

    expect(statusCalls).toEqual(["SCRAPING", "WRITING", "ILLUSTRATING", "NARRATING", "DONE"]);
  });

  it("calls scrapeUrl with story sourceUrl", async () => {
    await import("@/worker/index");
    const processor = await getProcessor();
    await processor({ data: { storyId } });
    expect(mockScrapeUrl).toHaveBeenCalledWith("https://example.com/article");
  });

  it("calls generateStory with scraped markdown", async () => {
    await import("@/worker/index");
    const processor = await getProcessor();
    await processor({ data: { storyId } });
    expect(mockGenerateStory).toHaveBeenCalledWith("article text");
  });

  it("calls generateImage with story text", async () => {
    await import("@/worker/index");
    const processor = await getProcessor();
    await processor({ data: { storyId } });
    expect(mockGenerateImage).toHaveBeenCalledWith("Once upon a time...");
  });

  it("calls generateAudio with story text and voiceId", async () => {
    await import("@/worker/index");
    const processor = await getProcessor();
    await processor({ data: { storyId } });
    expect(mockGenerateAudio).toHaveBeenCalledWith("Once upon a time...", "voice-abc");
  });

  it("final DB update includes title, content, wordCount, imageUrl, audioUrl, slug, status DONE", async () => {
    await import("@/worker/index");
    const processor = await getProcessor();
    await processor({ data: { storyId } });

    const finalUpdate = mockPrismaUpdate.mock.calls.find(
      (call: any[]) => call[0].data.status === "DONE"
    );
    expect(finalUpdate[0].data).toMatchObject({
      title: "The Brave Robot",
      content: "Once upon a time...",
      imageUrl: "https://s3.example.com/image.jpg",
      audioUrl: "https://s3.example.com/audio.mp3",
      status: "DONE",
    });
    expect(finalUpdate[0].data.wordCount).toBeGreaterThan(0);
    expect(finalUpdate[0].data.slug).toMatch(/^the-brave-robot-/);
  });

  it("on error: sets status ERROR with errorMessage and re-throws", async () => {
    mockScrapeUrl.mockRejectedValue(new Error("Firecrawl: failed to scrape URL"));

    await import("@/worker/index");
    const processor = await getProcessor();

    await expect(processor({ data: { storyId } })).rejects.toThrow("Firecrawl: failed to scrape URL");

    const errorUpdate = mockPrismaUpdate.mock.calls.find(
      (call: any[]) => call[0].data.status === "ERROR"
    );
    expect(errorUpdate[0].data).toMatchObject({
      status: "ERROR",
      errorMessage: "Firecrawl: failed to scrape URL",
    });
  });
});
