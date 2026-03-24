import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue({});

vi.mock("@aws-sdk/client-s3", () => {
  class S3ClientMock {
    send = mockSend;
  }

  class PutObjectCommandMock {
    _input: any;
    constructor(input: any) {
      this._input = input;
    }
  }

  class DeleteObjectCommandMock {
    _input: any;
    constructor(input: any) {
      this._input = input;
    }
  }

  return {
    S3Client: S3ClientMock,
    PutObjectCommand: vi.fn(function(input: any) {
      this._input = input;
    }),
    DeleteObjectCommand: vi.fn(function(input: any) {
      this._input = input;
    }),
  };
});

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY = "minioadmin";
    process.env.S3_SECRET_KEY = "minioadmin";
    process.env.S3_PUBLIC_BASE_URL = "http://localhost:9000";
  });

  it("uploadBuffer returns correct public URL", async () => {
    const { uploadBuffer } = await import("@/lib/storage");
    const url = await uploadBuffer("anystory-images", "stories/abc.jpg", Buffer.from("data"), "image/jpeg");
    expect(url).toBe("http://localhost:9000/anystory-images/stories/abc.jpg");
  });

  it("uploadBuffer calls PutObjectCommand with correct params", async () => {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { uploadBuffer } = await import("@/lib/storage");
    await uploadBuffer("anystory-audio", "stories/abc.mp3", Buffer.from("audio"), "audio/mpeg");
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "anystory-audio",
        Key: "stories/abc.mp3",
        ContentType: "audio/mpeg",
      })
    );
  });

  it("deleteObject calls DeleteObjectCommand with correct params", async () => {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const { deleteObject } = await import("@/lib/storage");
    await deleteObject("anystory-images", "stories/abc.jpg");
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "anystory-images",
      Key: "stories/abc.jpg",
    });
  });
});
