import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StoryCard } from "@/components/story/StoryCard";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = await prisma.story.findUnique({
    where: { slug },
    select: { title: true, content: true, imageUrl: true },
  });
  if (!story) return {};
  return {
    title: story.title,
    description: story.content.slice(0, 160),
    openGraph: {
      title: story.title,
      description: story.content.slice(0, 160),
      images: story.imageUrl ? [{ url: story.imageUrl }] : [],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const [session, story] = await Promise.all([
    auth(),
    prisma.story.findUnique({
      where: { slug, status: "DONE" },
      select: {
        id: true, slug: true, title: true, content: true,
        imageUrl: true, audioUrl: true, fontFamily: true,
        voiceName: true, sourceDomain: true, sourceUrl: true, userId: true,
      },
    }),
  ]);

  if (!story) notFound();

  return (
    <div className="flex flex-col items-center px-6 pb-20 pt-9">
      <StoryCard story={story} isAuthenticated={!!session} />
    </div>
  );
}
