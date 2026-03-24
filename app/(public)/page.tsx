import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HomeClient } from "@/components/generator/HomeClient";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [recentStories, storyCount] = await Promise.all([
    prisma.story.findMany({
      where: {
        status: "DONE",
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, slug: true, title: true,
        imageUrl: true, sourceDomain: true,
      },
    }),
    userId
      ? prisma.story.count({ where: { status: "DONE", userId } })
      : null,
  ]);

  return (
    <HomeClient
      session={session}
      recentStories={recentStories}
      storyCount={storyCount}
      isAuthenticated={!!session}
    />
  );
}
