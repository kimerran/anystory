"use client";

import { useEffect, useRef, useState } from "react";
import { VOICES } from "@/lib/voices";
import { cn } from "@/lib/utils";

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  className?: string;
}

export function VoiceSelector({ value, onChange, className }: VoiceSelectorProps) {
  const selected = VOICES.find((v) => v.id === value) ?? VOICES[0]!;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Narrator voice"
        className="flex h-[62px] w-full items-center justify-between rounded-xl border border-white/11 bg-white/5 px-3 transition hover:border-white/25"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true">🎙</span>
          <div className="text-left">
            <div className="font-fredoka text-sm font-medium text-white/75">{selected.name}</div>
            <div className="font-fredoka text-xs text-white/35">{selected.description}</div>
          </div>
        </div>
        <span className="text-xs text-white/28" aria-hidden="true">▾</span>
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/12 bg-[#2a1060] shadow-xl">
          {VOICES.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => { onChange(v.id); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 transition hover:bg-white/10",
                  v.id === value && "bg-white/8"
                )}
              >
                <span aria-hidden="true">🎙</span>
                <div className="text-left">
                  <div className="font-fredoka text-sm font-medium text-white/80">{v.name}</div>
                  <div className="font-fredoka text-xs text-white/40">{v.description}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
