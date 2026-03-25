import { NextResponse } from "next/server";
import { searchUrl } from "@/lib/firecrawl";

const TOPICS = [
  "how butterflies grow and change",
  "facts about dolphins for kids",
  "how rainbows form",
  "life cycle of a frog",
  "facts about the moon for children",
  "how honeybees make honey",
  "amazing facts about elephants",
  "how volcanoes work for kids",
  "facts about penguins",
  "how plants grow from seeds",
  "amazing facts about the ocean",
  "how birds learn to fly",
  "facts about giant pandas",
  "how snow forms",
  "amazing facts about dinosaurs for kids",
  "how caterpillars become butterflies",
  "facts about sea turtles",
  "how the sun gives us energy",
  "amazing facts about owls",
  "how spiders make webs",
];

export async function GET(): Promise<NextResponse> {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]!;

  try {
    const url = await searchUrl(topic);
    if (!url) {
      return NextResponse.json({ error: "Could not find a story topic right now" }, { status: 503 });
    }
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Could not find a story topic right now" }, { status: 503 });
  }
}
