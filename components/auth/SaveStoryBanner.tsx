import Link from "next/link";

export function SaveStoryBanner() {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-amber/18 bg-amber/7 px-5 py-4">
      <p className="font-fredoka text-sm leading-snug text-white/60">
        <strong className="text-white/85">Want to keep this story?</strong>{" "}
        Sign in to save it to your library and access it anytime.
      </p>
      <Link
        href="/signin"
        className="shrink-0 rounded-full border border-amber/35 bg-amber/15 px-4 py-2 font-fredoka text-sm font-semibold text-amber hover:bg-amber/25"
      >
        Save Story &rarr;
      </Link>
    </div>
  );
}
