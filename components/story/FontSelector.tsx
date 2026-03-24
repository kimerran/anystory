"use client";

import { STORY_FONTS } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface FontSelectorProps {
  value: string;
  onChange: (fontName: string) => void;
  className?: string;
}

export function FontSelector({ value, onChange, className }: FontSelectorProps) {
  const selected = STORY_FONTS.find((f) => f.name === value) ?? STORY_FONTS[0]!;

  return (
    <div className={cn("relative", className)}>
      {/* Native select hidden from text queries but functional for pointer events */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer"
        aria-label="Story font"
        style={{ opacity: 0, color: "transparent" }}
      >
        {STORY_FONTS.map((f) => (
          <option key={f.name} value={f.name} label={f.name}>{f.variable}</option>
        ))}
      </select>
      <div className="flex cursor-pointer items-center justify-between rounded-xl border border-white/11 bg-white/5 px-3 py-3 transition hover:border-white/25">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm text-white/70", selected.className)} aria-hidden="true">Aa</span>
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
