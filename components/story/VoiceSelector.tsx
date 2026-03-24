"use client";

import { VOICES } from "@/lib/voices";
import { cn } from "@/lib/utils";

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  className?: string;
}

export function VoiceSelector({ value, onChange, className }: VoiceSelectorProps) {
  const selected = VOICES.find((v) => v.id === value) ?? VOICES[0]!;

  return (
    <div className={cn("relative", className)}>
      {/* Native select hidden from text queries but functional for pointer events */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer"
        aria-label="Narrator voice"
        style={{ opacity: 0, color: "transparent" }}
      >
        {VOICES.map((v) => (
          <option key={v.id} value={v.id} label={v.name}>{v.id}</option>
        ))}
      </select>
      <div className="flex cursor-pointer items-center justify-between rounded-xl border border-white/11 bg-white/5 px-3 py-3 transition hover:border-white/25">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">🎙</span>
          <div>
            <div className="font-fredoka text-sm font-medium text-white/75">{selected.name}</div>
            <div className="font-fredoka text-xs text-white/35">{selected.description}</div>
          </div>
        </div>
        <span className="text-xs text-white/28" aria-hidden="true">▾</span>
      </div>
    </div>
  );
}
