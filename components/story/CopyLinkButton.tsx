"use client";

export function CopyLinkButton() {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(window.location.href)}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/13 bg-white/5 py-3 font-fredoka text-sm font-medium text-white/65 transition hover:border-white/25 hover:text-white"
    >
      🔗 Copy Link
    </button>
  );
}
