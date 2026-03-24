"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  narratorName: string;
}

export function AudioPlayer({ audioUrl, title, narratorName }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd  = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else           { void audio.play(); setIsPlaying(true); }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-2xl border border-white/9 bg-white/5 p-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f97316] text-base shadow-[0_4px_16px_rgba(249,115,22,0.45)]"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <div className="flex-1 overflow-hidden">
          <p className="truncate font-fredoka text-sm font-semibold text-white/78">{title}</p>
          <p className="font-fredoka text-xs text-white/38">🎙 {narratorName}</p>
        </div>
        <span className="shrink-0 font-fredoka text-xs text-white/38">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>

      {/* Seek bar */}
      <div
        className="relative h-1 cursor-pointer rounded-full bg-white/9"
        onClick={seek}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] to-[#f97316]"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-amber shadow-[0_0_8px_rgba(251,191,36,0.8)] transition"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

    </div>
  );
}
