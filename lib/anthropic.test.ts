import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = { create: mockCreate };
    },
  };
});

describe("generateStory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("calls messages.create with correct model and params", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ title: "The Brave Robot", story: "Once upon a time..." }) }],
    });

    const { generateStory } = await import("@/lib/anthropic");
    await generateStory("Some news article content");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: expect.stringContaining("children's story"),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user" }),
        ]),
      })
    );
  });

  it("returns parsed title and story from JSON response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ title: "The Brave Robot", story: "Once upon a time a robot..." }) }],
    });

    const { generateStory } = await import("@/lib/anthropic");
    const result = await generateStory("content");
    expect(result).toEqual({ title: "The Brave Robot", story: "Once upon a time a robot..." });
  });

  it("throws on malformed JSON response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not valid json at all" }],
    });

    const { generateStory } = await import("@/lib/anthropic");
    await expect(generateStory("content")).rejects.toThrow("Claude: invalid JSON response");
  });

  it("throws when response is valid JSON but missing required fields", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ name: "wrong field" }) }],
    });

    const { generateStory } = await import("@/lib/anthropic");
    await expect(generateStory("content")).rejects.toThrow("Claude: invalid JSON response");
  });
});
