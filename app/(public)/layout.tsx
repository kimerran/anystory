import { auth } from "@/auth";
import { UserNav } from "@/components/ui/UserNav";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1e1145] via-[#3d1a6e] to-[#7c2d12]">
      {/* Stars */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px),
            radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px),
            radial-gradient(circle, rgba(251,191,36,0.55) 1px, transparent 1px)
          `,
          backgroundSize: "88px 88px, 148px 148px, 230px 230px",
          backgroundPosition: "0 0, 44px 44px, 88px 28px",
        }}
        aria-hidden="true"
      />

      {/* Moon */}
      <div
        className="pointer-events-none absolute right-12 top-7 h-16 w-16 rounded-full"
        style={{
          background: "radial-gradient(circle at 38% 40%, #fef9e7, #fbbf24)",
          boxShadow: "0 0 28px rgba(251,191,36,0.65), 0 0 72px rgba(251,191,36,0.22)",
        }}
        aria-hidden="true"
      />

      {/* Page nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="bg-gradient-to-r from-amber to-orange bg-clip-text font-fredoka text-2xl font-bold text-transparent">
          📖 AnyStory
        </span>
        <UserNav session={session} />
      </nav>

      {/* Page content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
