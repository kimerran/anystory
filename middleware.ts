import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use the Edge-compatible auth config (no DB adapter) for middleware.
// The full auth config with PrismaAdapter lives in auth.ts and is used
// only in server components / API routes where Node.js is available.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
