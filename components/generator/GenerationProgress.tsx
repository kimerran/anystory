"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface StoryStatus {
  status: string;
  step: number;
  totalSteps: number;
  stepLabel: string;
  error: string | null;
  storyUrl: string | null;
  slug: string | null;
}

const STEPS = [
  { label: "Scraping website",          icon: "🔍", note: "Extracting content" },
  { label: "Writing your story",        icon: "✍️", note: "Claude Sonnet" },
  { label: "Painting the illustration", icon: "🎨", note: "Fal AI Flux Pro" },
  { label: "Recording narration",       icon: "🎙", note: "ElevenLabs TTS" },
];

interface Props {
  storyId: string;
  onComplete: (slug: string) => void;
  onError: () => void;
}

export function GenerationProgress({ storyId, onComplete, onError }: Props) {
  const [status, setStatus] = useState<StoryStatus | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/stories/status/${storyId}`);
        if (!res.ok) throw new Error("Status fetch failed");
        const data = await res.json() as StoryStatus;
        setStatus(data);

        if (data.status === "DONE" && data.slug) {
          clearInterval(interval);
          onComplete(data.slug);
        } else if (data.status === "ERROR") {
          clearInterval(interval);
          onError();
        }
      } catch {
        clearInterval(interval);
        onError();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [storyId, onComplete, onError]);

  const currentStep = status?.step ?? 0;
  const progressPct = Math.min((currentStep / 4) * 100, 100);

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-2 font-fredoka text-3xl font-semibold text-white">Crafting your story…</h2>
      <p className="mb-12 font-fredoka text-base text-white/50">Usually takes 30–60 seconds</p>

      <div className="w-full max-w-md rounded-3xl border border-white/12 bg-white/7 p-8 backdrop-blur-xl">
        <div className="flex flex-col gap-5">
          {STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isDone    = currentStep > stepNum;
            const isActive  = currentStep === stepNum;
            const isPending = currentStep < stepNum;

            return (
              <div key={step.label} className="flex items-center gap-4">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
                  isDone   && "border border-green-400/45 bg-green-400/18",
                  isActive && "border border-amber/55 bg-amber/18 animate-pulse",
                  isPending && "border border-white/9 bg-white/4",
                )}>
                  {step.icon}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    "font-fredoka text-base font-medium",
                    isDone   && "text-green-400/90",
                    isActive && "text-amber",
                    isPending && "text-white/28",
                  )}>
                    {step.label}
                  </p>
                  <p className="font-fredoka text-xs text-white/30">{step.note}</p>
                </div>
                <span className="text-lg">
                  {isDone ? "✅" : isActive ? "⏳" : "○"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          className="mt-7 h-1.5 overflow-hidden rounded-full bg-white/7"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] to-[#f97316] shadow-[0_0_10px_rgba(249,115,22,0.55)] transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
