"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { cn } from "@/lib/utils";

interface UserNavProps {
  session: Session | null;
  className?: string;
}

export function UserNav({ session, className }: UserNavProps) {
  if (!session?.user) {
    return (
      <Link
        href="/signin"
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2",
          "font-fredoka text-sm font-medium text-white/80 transition hover:bg-white/13 hover:text-white",
          className
        )}
      >
        {/* Google G icon */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
          <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/>
          <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
          <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
        </svg>
        Sign in
      </Link>
    );
  }

  const initial = session.user.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-fredoka text-sm text-white/70">{session.user.name}</span>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber to-orange text-sm font-bold text-black shadow-[0_0_0_2px_rgba(251,191,36,0.3)]"
        aria-label={`Signed in as ${session.user.name}`}
      >
        {initial}
      </div>
    </div>
  );
}
