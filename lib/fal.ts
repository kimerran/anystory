import { fal } from "@fal-ai/client";
import ky from "ky";

export async function generateImage(storyText: string): Promise<Buffer> {
  const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
    input: {
      aspect_ratio: "3:4",
      prompt: `A children's book illustration: ${storyText} Warm, colorful, whimsical, Pixar-inspired style. No text in image.`,
    },
  });

  const data = result.data as { images?: Array<{ url: string }> };
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("Fal: no image URL returned");

  const arrayBuffer = await ky(imageUrl).arrayBuffer();
  return Buffer.from(arrayBuffer);
}
