import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HomeClient } from "@/components/generator/HomeClient";

export default async function HomePage() {
  const session = await auth();

  const recentStories = await prisma.story.findMany({
    where: { status: "DONE" },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true, slug: true, title: true,
      imageUrl: true, sourceDomain: true,
    },
  });

  return (
    <HomeClient
      session={session}
      recentStories={recentStories}
      isAuthenticated={!!session}
    />
  );
}
