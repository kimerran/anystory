import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSubscribe = vi.fn();
const mockKyGet = vi.fn();

vi.mock("@fal-ai/client", () => ({
  fal: { subscribe: mockSubscribe, config: vi.fn() },
}));

vi.mock("ky", () => ({
  default: mockKyGet,
}));

describe("generateImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls fal.subscribe with correct model and params", async () => {
    mockSubscribe.mockResolvedValue({
      data: { images: [{ url: "https://fal.cdn/image.jpg" }] },
    });
    mockKyGet.mockReturnValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });

    const { generateImage } = await import("@/lib/fal");
    await generateImage("A brave little robot explores the forest.");

    expect(mockSubscribe).toHaveBeenCalledWith(
      "fal-ai/flux-pro/v1.1-ultra",
      expect.objectContaining({
        input: expect.objectContaining({
          aspect_ratio: "3:4",
          prompt: expect.stringContaining("A brave little robot"),
        }),
      })
    );
  });

  it("downloads the image URL and returns a Buffer", async () => {
    const fakeBuffer = Buffer.from([1, 2, 3, 4]);
    mockSubscribe.mockResolvedValue({
      data: { images: [{ url: "https://fal.cdn/image.jpg" }] },
    });
    mockKyGet.mockReturnValue({
      arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer.buffer),
    });

    const { generateImage } = await import("@/lib/fal");
    const result = await generateImage("story text");

    expect(mockKyGet).toHaveBeenCalledWith("https://fal.cdn/image.jpg");
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("throws when no images are returned", async () => {
    mockSubscribe.mockResolvedValue({ data: { images: [] } });

    const { generateImage } = await import("@/lib/fal");
    await expect(generateImage("story text")).rejects.toThrow("Fal: no image URL returned");
  });

  it("throws when images array is missing", async () => {
    mockSubscribe.mockResolvedValue({ data: {} });

    const { generateImage } = await import("@/lib/fal");
    await expect(generateImage("story text")).rejects.toThrow("Fal: no image URL returned");
  });
});
