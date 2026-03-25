"use client";

import { useEffect, useRef, useState } from "react";
import { STORY_FONTS } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface FontSelectorProps {
  value: string;
  onChange: (fontName: string) => void;
  className?: string;
}

export function FontSelector({ value, onChange, className }: FontSelectorProps) {
  const selected = STORY_FONTS.find((f) => f.name === value) ?? STORY_FONTS[0]!;
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
        aria-label="Story font"
        className="flex h-[62px] w-full items-center justify-between rounded-xl border border-white/11 bg-white/5 px-3 transition hover:border-white/25"
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-sm text-white/70", selected.className)} aria-hidden="true">Aa</span>
          <div className="text-left">
            <div className="font-fredoka text-sm font-medium text-white/75">{selected.name}</div>
            <div className="font-fredoka text-xs text-white/35">{selected.description}</div>
          </div>
        </div>
        <span className="text-xs text-white/28" aria-hidden="true">▾</span>
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/12 bg-[#2a1060] shadow-xl">
          {STORY_FONTS.map((f) => (
            <li key={f.name}>
              <button
                type="button"
                onClick={() => { onChange(f.name); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 transition hover:bg-white/10",
                  f.name === value && "bg-white/8"
                )}
              >
                <span className={cn("text-sm text-white/70", f.className)} aria-hidden="true">Aa</span>
                <div className="text-left">
                  <div className="font-fredoka text-sm font-medium text-white/80">{f.name}</div>
                  <div className="font-fredoka text-xs text-white/40">{f.description}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
