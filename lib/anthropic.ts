import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const StorySchema = z.object({
  title: z.string(),
  story: z.string(),
});

export async function generateStory(content: string): Promise<{ title: string; story: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system:
      "You are a children's story author. Respond with valid JSON only. No markdown, no explanation.",
    messages: [
      {
        role: "user",
        content: `Create a 100-word children's story inspired by the following content. Respond ONLY with this JSON: { "title": "...", "story": "..." }\n\n${content}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Claude: invalid JSON response");
  }

  const result = StorySchema.safeParse(parsed);
  if (!result.success) throw new Error("Claude: invalid JSON response");

  return result.data;
}
