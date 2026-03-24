"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { VOICES } from "@/lib/voices";
import { STORY_FONTS } from "@/lib/fonts";
import { VoiceSelector } from "@/components/story/VoiceSelector";
import { FontSelector } from "@/components/story/FontSelector";
import { SignInNudge } from "@/components/auth/SignInNudge";

const schema = z.object({
  url:      z.string().url("Please enter a valid URL (include https://)"),
  voiceId:  z.string(),
  fontName: z.string(),
});

export type UrlFormValues = z.infer<typeof schema>;

interface UrlFormProps {
  onSubmit: (values: UrlFormValues) => void;
  isLoading: boolean;
  isAuthenticated?: boolean;
}

export function UrlForm({ onSubmit, isLoading, isAuthenticated = false }: UrlFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UrlFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      voiceId:  VOICES[0]!.id,
      fontName: STORY_FONTS[0]!.name,
    },
  });

  const voiceId  = watch("voiceId");
  const fontName = watch("fontName");

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4 rounded-3xl border border-white/12 bg-white/7 p-6 shadow-2xl backdrop-blur-xl"
    >
      {/* URL input */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-amber/50">
          <span className="text-white/40" aria-hidden="true">🔗</span>
          <input
            {...register("url")}
            type="url"
            placeholder="https://example.com/article"
            className="flex-1 bg-transparent font-fredoka text-sm text-white placeholder:text-white/30 focus:outline-none"
            disabled={isLoading}
          />
        </div>
        {errors.url && (
          <p className="ml-1 font-fredoka text-xs text-[#f87171]">{errors.url.message}</p>
        )}
      </div>

      {/* Voice + Font selectors */}
      <div className="grid grid-cols-2 gap-3">
        <VoiceSelector
          value={voiceId}
          onChange={(id) => setValue("voiceId", id)}
        />
        <FontSelector
          value={fontName}
          onChange={(name) => setValue("fontName", name)}
        />
      </div>

      {/* CTA */}
      <button
        type="submit"
        disabled={isLoading}
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#fbbf24] to-[#f97316] py-3 font-fredoka text-base font-semibold text-black shadow-[0_0_20px_rgba(251,191,36,0.3)] transition hover:shadow-[0_0_28px_rgba(251,191,36,0.5)] disabled:opacity-60"
      >
        {isLoading ? "Generating\u2026" : "\u2728 Generate My Story"}
      </button>

      {!isAuthenticated && <SignInNudge />}
    </form>
  );
}
