import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { story: { findUnique: mockFindUnique } },
}));

function makeStory(status: string, overrides?: object) {
  return { id: "story-abc", slug: "my-cool-story-abc1", status, errorMessage: null, ...overrides };
}

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/stories/status/${id}`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/stories/status/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when story not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("missing"), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns step=0 for PENDING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("PENDING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(0);
    expect(data.stepLabel).toBe("Queued");
    expect(data.status).toBe("PENDING");
  });

  it("returns step=1 for SCRAPING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("SCRAPING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(1);
    expect(data.stepLabel).toBe("Scraping website");
  });

  it("returns step=2 for WRITING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("WRITING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(2);
    expect(data.stepLabel).toBe("Writing your story");
  });

  it("returns step=3 for ILLUSTRATING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("ILLUSTRATING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(3);
    expect(data.stepLabel).toBe("Painting the illustration");
  });

  it("returns step=4 for NARRATING", async () => {
    mockFindUnique.mockResolvedValue(makeStory("NARRATING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(4);
    expect(data.stepLabel).toBe("Recording narration");
  });

  it("returns step=5, correct slug, and storyUrl null for DONE", async () => {
    mockFindUnique.mockResolvedValue(makeStory("DONE", { slug: "the-brave-robot-abc1" }));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.step).toBe(5);
    expect(data.slug).toBe("the-brave-robot-abc1");
    expect(data.status).toBe("DONE");
    expect(data.storyUrl).toBeNull();
  });

  it("returns error for ERROR status and omits step/stepLabel", async () => {
    mockFindUnique.mockResolvedValue(makeStory("ERROR", { errorMessage: "Scraping failed" }));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.status).toBe("ERROR");
    expect(data.error).toBe("Scraping failed");
    expect(data.step).toBeUndefined();
    expect(data.stepLabel).toBeUndefined();
  });

  it("includes totalSteps: 5 in all non-error responses", async () => {
    mockFindUnique.mockResolvedValue(makeStory("WRITING"));
    const { GET } = await import("@/app/api/stories/status/[id]/route");
    const res = await GET(makeRequest("story-abc"), makeParams("story-abc"));
    const data = await res.json();
    expect(data.totalSteps).toBe(5);
  });
});
