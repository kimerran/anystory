import { describe, it, expect, vi, beforeEach } from "vitest";

const mockKyPost = vi.fn();

vi.mock("ky", () => ({
  default: {
    post: mockKyPost,
  },
}));

describe("scrapeUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FIRECRAWL_API_KEY = "test-key";
  });

  it("POSTs to the correct endpoint with correct params", async () => {
    mockKyPost.mockReturnValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { markdown: "Hello world content" },
      }),
    });

    const { scrapeUrl } = await import("@/lib/firecrawl");
    await scrapeUrl("https://example.com/article");

    expect(mockKyPost).toHaveBeenCalledWith(
      "https://api.firecrawl.dev/v1/scrape",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-key" },
        json: {
          url: "https://example.com/article",
          formats: ["markdown"],
          onlyMainContent: true,
          timeout: 30000,
        },
      })
    );
  });

  it("returns the markdown from the response", async () => {
    mockKyPost.mockReturnValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { markdown: "Some article content here" },
      }),
    });

    const { scrapeUrl } = await import("@/lib/firecrawl");
    const result = await scrapeUrl("https://example.com");
    expect(result).toEqual({ markdown: "Some article content here" });
  });

  it("truncates markdown to 4000 characters", async () => {
    const longMarkdown = "x".repeat(5000);
    mockKyPost.mockReturnValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { markdown: longMarkdown },
      }),
    });

    const { scrapeUrl } = await import("@/lib/firecrawl");
    const result = await scrapeUrl("https://example.com");
    expect(result.markdown.length).toBe(4000);
  });

  it("throws when markdown is empty", async () => {
    mockKyPost.mockReturnValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { markdown: "" },
      }),
    });

    const { scrapeUrl } = await import("@/lib/firecrawl");
    await expect(scrapeUrl("https://example.com")).rejects.toThrow(
      "Firecrawl: failed to scrape URL"
    );
  });

  it("throws when data is missing", async () => {
    mockKyPost.mockReturnValue({
      json: vi.fn().mockResolvedValue({ success: false }),
    });

    const { scrapeUrl } = await import("@/lib/firecrawl");
    await expect(scrapeUrl("https://example.com")).rejects.toThrow(
      "Firecrawl: failed to scrape URL"
    );
  });
});
