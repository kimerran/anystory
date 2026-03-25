import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const story = await prisma.story.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, imageUrl: true, audioUrl: true, title: true } });
  console.log("Found:", JSON.stringify(story, null, 2));
  if (story) {
    const newImageUrl = story.imageUrl?.replace("http://localhost:9000", "http://localhost:3000/api/media");
    const newAudioUrl = story.audioUrl?.replace("http://localhost:9000", "http://localhost:3000/api/media");
    await prisma.story.update({ where: { id: story.id }, data: { imageUrl: newImageUrl, audioUrl: newAudioUrl } });
    console.log("Updated imageUrl:", newImageUrl);
    console.log("Updated audioUrl:", newAudioUrl);
  }
  await prisma.$disconnect();
}
main();
