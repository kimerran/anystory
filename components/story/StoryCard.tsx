"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AudioPlayer } from "@/components/story/AudioPlayer";
import { CopyLinkButton } from "@/components/story/CopyLinkButton";
import { SaveStoryBanner } from "@/components/auth/SaveStoryBanner";
import { STORY_FONTS } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface Story {
  title: string;
  content: string;
  imageUrl: string | null;
  audioUrl: string | null;
  fontFamily: string;
  voiceName: string;
  sourceDomain: string;
  sourceUrl: string;
  slug: string;
}

interface StoryCardProps {
  story: Story;
  isAuthenticated: boolean;
}

export function StoryCard({ story, isAuthenticated }: StoryCardProps) {
  const font = STORY_FONTS.find((f) => f.name === story.fontFamily) ?? STORY_FONTS[0]!;
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="w-full max-w-[560px] overflow-hidden rounded-3xl border border-white/12 bg-white/7 shadow-[0_32px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      {/* Illustration */}
      <div className="relative h-[220px] overflow-hidden bg-gradient-to-br from-green-900/80 via-green-700/60 to-green-950 sm:h-[340px]">
        {story.imageUrl ? (
          <Image
            src={story.imageUrl}
            alt={story.title}
            fill
            className="object-cover"
            priority
            unoptimized
            style={isPlaying ? {
              animation: "pan-down 30s linear infinite alternate",
            } : {
              objectPosition: "center top",
              transition: "object-position 1s ease",
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl" aria-label={story.title}>
            📖
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/45 px-2.5 py-1 font-fredoka text-xs text-white/65 backdrop-blur-md">
          🎨 Fal AI · Flux Pro Ultra
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-6 sm:px-8 sm:py-7">
        <a
          href={story.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2.5 font-fredoka text-xs text-white/33 transition hover:text-amber/60"
        >
          📎 Story inspired from <span className="underline">{story.sourceDomain}</span>
        </a>

        <h1 className="mb-4 bg-gradient-to-br from-[#fbbf24] to-[#f97316] bg-clip-text text-[26px] font-bubblegum leading-tight text-transparent sm:text-[32px]">
          {story.title}
        </h1>

        <p className={cn("mb-7 text-lg leading-[1.78] text-white/80", font.className)}>
          {story.content}
        </p>

        {/* Audio player */}
        {story.audioUrl && (
          <div className="mb-6">
            <AudioPlayer
              audioUrl={story.audioUrl}
              title={story.title}
              narratorName={story.voiceName}
              onPlayingChange={setIsPlaying}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2.5">
          <CopyLinkButton />
          {story.audioUrl && (
            <a
              href={story.audioUrl}
              download
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/13 bg-white/5 py-3 font-fredoka text-sm font-medium text-white/65 transition hover:border-white/25 hover:text-white"
            >
              ⬇ Download MP3
            </a>
          )}
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-none bg-gradient-to-br from-[#fbbf24] to-[#f97316] py-3 font-fredoka text-sm font-semibold text-white shadow-[0_4px_16px_rgba(249,115,22,0.4)]"
          >
            ✨ New Story
          </Link>
        </div>

        {/* Auth state */}
        {isAuthenticated ? (
          <p className="mt-4 flex items-center gap-2 font-fredoka text-sm text-green-400/70">
            ✅ <span>Saved to your library</span>
          </p>
        ) : (
          <SaveStoryBanner />
        )}
      </div>
    </div>
  );
}
