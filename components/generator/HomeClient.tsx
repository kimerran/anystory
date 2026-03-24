"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { UrlForm, type UrlFormValues } from "@/components/generator/UrlForm";
import { GenerationProgress } from "@/components/generator/GenerationProgress";
import { VOICES } from "@/lib/voices";
import Link from "next/link";

interface Story {
  id: string; slug: string; title: string;
  imageUrl: string | null; sourceDomain: string;
}

interface HomeClientProps {
  session: Session | null;
  recentStories: Story[];
  isAuthenticated: boolean;
}

export function HomeClient({ session, recentStories, isAuthenticated }: HomeClientProps) {
  const router = useRouter();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleGenerate(values: UrlFormValues) {
    setIsLoading(true);
    try {
      const voice = VOICES.find((v) => v.id === values.voiceId);
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: values.url,
          voiceId: values.voiceId,
          voiceName: voice?.name ?? values.voiceId,
          fontFamily: values.fontName,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Failed to start generation");
      }
      const data = await res.json() as { storyId: string };
      setGeneratingId(data.storyId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (generatingId) {
    return (
      <div className="flex flex-col items-center px-6 pb-20 pt-16">
        <GenerationProgress
          storyId={generatingId}
          onComplete={(slug) => router.push(`/story/${slug}`)}
          onError={() => setGeneratingId(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 pb-20 pt-14">
      {/* Logo + tagline */}
      <h1 className="bg-gradient-to-br from-[#fbbf24] to-[#f97316] bg-clip-text font-fredoka text-5xl font-bold text-transparent drop-shadow-[0_2px_24px_rgba(251,191,36,0.3)]">
        📖 AnyStory
      </h1>
      <p className="mt-2.5 mb-10 max-w-sm text-center font-fredoka text-lg font-normal leading-relaxed text-white/55">
        Turn any website into a bedtime story — in seconds
      </p>

      <UrlForm
        onSubmit={handleGenerate}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
      />

      {/* Recent stories */}
      <div className="mt-12 w-full max-w-[520px]">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-fredoka text-xs font-semibold uppercase tracking-wider text-white/38">
            {isAuthenticated ? "My Stories" : "Recent Public Stories"}
          </span>
          {isAuthenticated && recentStories.length > 0 && (
            <span className="font-fredoka text-sm text-amber/70">
              {recentStories.length} stories
            </span>
          )}
        </div>

        {isAuthenticated && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber/20 bg-amber/10 px-4 py-2.5 font-fredoka text-sm text-white/65">
            <span>⭐</span>
            <span>Signed in as <strong className="text-amber">{session?.user?.email}</strong> — stories saved automatically</span>
          </div>
        )}

        {recentStories.length === 0 ? (
          <p className="text-center font-fredoka text-sm text-white/30">No stories yet — be the first!</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {recentStories.map((story) => (
              <Link
                key={story.id}
                href={`/story/${story.slug}`}
                className="group overflow-hidden rounded-xl border border-white/12 bg-white/7 transition hover:-translate-y-1 hover:border-amber/28"
              >
                <div className="flex h-[72px] items-center justify-center bg-gradient-to-br from-amber/18 to-orange/18 text-3xl">
                  📖
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 font-fredoka text-[11px] font-semibold leading-tight text-white/78">
                    {story.title}
                  </p>
                  <p className="mt-1 font-fredoka text-[9.5px] text-white/33">{story.sourceDomain}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
