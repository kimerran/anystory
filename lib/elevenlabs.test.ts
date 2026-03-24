import { describe, it, expect, vi, beforeEach } from "vitest";

const mockKyPost = vi.fn();

vi.mock("ky", () => ({
  default: {
    post: mockKyPost,
  },
}));

describe("generateAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = "test-el-key";
  });

  it("POSTs to the correct endpoint with correct headers and body", async () => {
    const fakeBuffer = Buffer.from([1, 2, 3]);
    mockKyPost.mockReturnValue({
      arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer.buffer),
    });

    const { generateAudio } = await import("@/lib/elevenlabs");
    await generateAudio("Hello world story.", "voice-abc");

    expect(mockKyPost).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/text-to-speech/voice-abc",
      expect.objectContaining({
        headers: { "xi-api-key": "test-el-key" },
        searchParams: { output_format: "mp3_44100_128" },
        json: expect.objectContaining({
          text: "Hello world story.",
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.85,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      })
    );
  });

  it("returns binary response as Buffer", async () => {
    const fakeBuffer = Buffer.from([10, 20, 30, 40]);
    mockKyPost.mockReturnValue({
      arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer.buffer),
    });

    const { generateAudio } = await import("@/lib/elevenlabs");
    const result = await generateAudio("story text", "voice-xyz");

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("uses the provided voiceId in the URL", async () => {
    mockKyPost.mockReturnValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
    });

    const { generateAudio } = await import("@/lib/elevenlabs");
    await generateAudio("text", "voice-special-123");

    expect(mockKyPost).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/text-to-speech/voice-special-123",
      expect.any(Object)
    );
  });

  it("throws 'ElevenLabs: audio generation failed' on HTTP error", async () => {
    mockKyPost.mockReturnValue({
      arrayBuffer: vi.fn().mockRejectedValue(new Error("HTTP 500")),
    });

    const { generateAudio } = await import("@/lib/elevenlabs");
    await expect(generateAudio("text", "voice-abc")).rejects.toThrow(
      "ElevenLabs: audio generation failed"
    );
  });
});
