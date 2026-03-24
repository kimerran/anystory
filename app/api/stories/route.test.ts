import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock lib/fonts FIRST — it imports next/font/google at module scope which crashes in Vitest
vi.mock("@/lib/fonts", () => ({
  STORY_FONTS: [
    { name: "Bubblegum Sans", variable: "--font-bubblegum", description: "Playful", className: "font-bubblegum" },
    { name: "Patrick Hand",   variable: "--font-patrick",   description: "Handwritten", className: "font-patrick" },
  ],
}));

vi.mock("@/lib/voices", () => ({
  VOICES: [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Warm" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",   description: "Energetic" },
  ],
}));

const mockCreate = vi.fn().mockResolvedValue({ id: "story-abc", slug: "abc1234567" });

vi.mock("@/lib/prisma", () => ({
  prisma: { story: { create: mockCreate } },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 4 }),
}));

vi.mock("@/lib/queue", () => ({
  enqueueStory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

function makeRequest(body: object, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/stories", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const VALID_BODY = {
  url: "https://example.com/article",
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  voiceName: "Rachel",
  fontFamily: "Bubblegum Sans",
};

describe("POST /api/stories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: "story-abc", slug: "abc1234567" });
  });

  it("returns 201 with storyId, slug, and pollUrl for valid request", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toMatchObject({
      storyId: "story-abc",
      slug: "abc1234567",
      pollUrl: "/api/stories/status/story-abc",
    });
  });

  it("creates story with correct field names in DB", async () => {
    const { POST } = await import("@/app/api/stories/route");
    await POST(makeRequest(VALID_BODY));
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceUrl: "https://example.com/article",
        sourceDomain: "example.com",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        voiceName: "Rachel",
        fontFamily: "Bubblegum Sans",
        status: "PENDING",
        title: "",
        content: "",
        wordCount: 0,
      }),
    });
  });

  it("stores ipHash in story", async () => {
    const { POST } = await import("@/app/api/stories/route");
    await POST(makeRequest(VALID_BODY, { "x-forwarded-for": "1.2.3.4" }));
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ipHash: expect.any(String) }),
    });
    // ipHash should be a sha256 hex string (64 chars)
    const callArg = mockCreate.mock.calls[0]![0] as { data: { ipHash: string } };
    expect(callArg.data.ipHash).toHaveLength(64);
  });

  it("returns 400 for invalid URL", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest({ ...VALID_BODY, url: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid voiceId", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest({ ...VALID_BODY, voiceId: "invalid-voice" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid fontFamily", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest({ ...VALID_BODY, fontFamily: "Comic Sans" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });
    const { POST } = await import("@/app/api/stories/route");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data).toMatchObject({ error: "Rate limit exceeded" });
  });
});
