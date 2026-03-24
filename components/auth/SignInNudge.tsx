import Link from "next/link";

export function SignInNudge() {
  return (
    <p className="mt-3 text-center font-fredoka text-sm text-white/35">
      Want to save your stories?{" "}
      <Link href="/signin" className="text-amber/80 underline hover:text-amber">
        Sign in with Google
      </Link>
    </p>
  );
}
