import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-compatible auth configuration — no database adapter.
 * Used by middleware.ts which runs in the Edge Runtime.
 * The full auth config (with PrismaAdapter) lives in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized({ auth }) {
      // Allow all requests — we handle access control at the route level.
      return true;
    },
  },
};
