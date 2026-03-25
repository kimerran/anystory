import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e1145] via-[#3d1a6e] to-[#7c2d12] px-6 pt-20">
      {/* Stars */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px),
            radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "88px 88px, 148px 148px",
          backgroundPosition: "0 0, 44px 44px",
        }}
        aria-hidden="true"
      />
      {/* Moon */}
      <div
        className="pointer-events-none absolute right-12 top-7 h-14 w-14 rounded-full"
        style={{
          background: "radial-gradient(circle at 38% 40%, #fef9e7, #fbbf24)",
          boxShadow: "0 0 28px rgba(251,191,36,0.65)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-3xl border border-white/12 bg-white/7 p-10 text-center shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <p className="mb-1 bg-gradient-to-br from-[#fbbf24] to-[#f97316] bg-clip-text font-fredoka text-4xl font-bold text-transparent">
            📖 AnyStory
          </p>
          <p className="mb-2 font-fredoka text-lg text-white">Welcome back!</p>
          <p className="mb-9 font-fredoka text-sm leading-relaxed text-white/35">
            Sign in to save your stories, build your library, and pick up right where you left off.
          </p>

          {/* Google OAuth button — server action */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border-none bg-white px-5 py-3.5 font-fredoka text-base font-semibold text-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(0,0,0,0.4)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/>
                <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
                <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="mb-4 font-fredoka text-xs text-white/25">— or —</p>
          <a
            href="/"
            className="font-fredoka text-sm text-white/40 underline hover:text-white/65"
          >
            Continue without signing in
          </a>

          {/* Benefits */}
          <div className="mt-8 space-y-2.5 rounded-xl border border-white/7 bg-white/4 p-4 text-left">
            {[
              { icon: "📚", text: "Your story library, saved forever" },
              { icon: "🔗", text: "Shareable links tied to your account" },
              { icon: "🆓", text: "Free to use — no credit card" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 font-fredoka text-sm text-white/55">
                <span className="w-5 text-center text-base">{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
