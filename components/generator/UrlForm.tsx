"use client";

import { useState } from "react";
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

type UrlStatus = "idle" | "checking" | "ok" | "error";

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

  const [urlStatus, setUrlStatus] = useState<UrlStatus>("idle");
  const [urlCheckError, setUrlCheckError] = useState<string | null>(null);
  const [isSurprising, setIsSurprising] = useState(false);

  async function checkUrl(url: string) {
    if (!z.string().url().safeParse(url).success) return;

    setUrlStatus("checking");
    setUrlCheckError(null);
    try {
      const res = await fetch("/api/check-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as { reachable: boolean; reason?: string };
      if (data.reachable) {
        setUrlStatus("ok");
      } else {
        setUrlStatus("error");
        setUrlCheckError(data.reason ?? "We can't reach this URL");
      }
    } catch {
      setUrlStatus("error");
      setUrlCheckError("Could not check this URL — please try again");
    }
  }

  async function handleSurprise() {
    setIsSurprising(true);
    setUrlStatus("idle");
    setUrlCheckError(null);
    try {
      const res = await fetch("/api/surprise");
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        setValue("url", data.url, { shouldValidate: true });
        await checkUrl(data.url);
      }
    } catch {
      // silent fail
    } finally {
      setIsSurprising(false);
    }
  }

  const urlRegistration = register("url");

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="w-full flex flex-col gap-4 rounded-3xl border border-white/12 bg-white/7 p-6 shadow-2xl backdrop-blur-xl"
    >
      {/* URL input */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-amber/50">
          <span className="text-white/40" aria-hidden="true">🔗</span>
          <input
            {...urlRegistration}
            type="url"
            placeholder="https://example.com/article"
            className="min-w-0 flex-1 bg-transparent font-fredoka text-sm text-white placeholder:text-white/30 focus:outline-none"
            disabled={isLoading}
            onBlur={(e) => {
              void urlRegistration.onBlur(e);
              void checkUrl(e.target.value);
            }}
            onChange={(e) => {
              void urlRegistration.onChange(e);
              if (urlStatus !== "idle") {
                setUrlStatus("idle");
                setUrlCheckError(null);
              }
            }}
          />
          {urlStatus === "checking" && (
            <span className="animate-pulse font-fredoka text-xs text-white/45">checking</span>
          )}
          {urlStatus === "ok" && (
            <span className="font-fredoka text-xs text-green-400">✓</span>
          )}
          {urlStatus === "error" && (
            <span className="font-fredoka text-xs text-[#f87171]">✗</span>
          )}
          <button
            type="button"
            onClick={() => void handleSurprise()}
            disabled={isLoading || isSurprising}
            className="ml-1 shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-fredoka text-xs text-white/55 transition hover:border-amber/40 hover:text-amber disabled:opacity-40"
          >
            {isSurprising ? "…" : "🎲"}<span className="hidden sm:inline">{isSurprising ? "" : " Surprise me"}</span>
          </button>
        </div>
        {errors.url && (
          <p className="ml-1 font-fredoka text-xs text-[#f87171]">{errors.url.message}</p>
        )}
        {urlStatus === "error" && urlCheckError && !errors.url && (
          <p className="ml-1 font-fredoka text-xs text-[#f87171]">{urlCheckError}</p>
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
        disabled={isLoading || urlStatus === "checking" || urlStatus === "error"}
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#fbbf24] to-[#f97316] py-3 font-fredoka text-base font-semibold text-black shadow-[0_0_20px_rgba(251,191,36,0.3)] transition hover:shadow-[0_0_28px_rgba(251,191,36,0.5)] disabled:opacity-60"
      >
        {isLoading ? "Generating\u2026" : "\u2728 Generate My Story"}
      </button>

      {!isAuthenticated && <SignInNudge />}
    </form>
  );
}
