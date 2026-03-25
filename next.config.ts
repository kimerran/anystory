import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/api/media/**" },
    ],
  },
  // Prevent Next.js from bundling Prisma's server-only runtime,
  // which uses node: URI imports (node:crypto, node:path, etc.).
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg", "pg"],
  // Turbopack is the default bundler in Next.js 16. Explicit empty config
  // signals that no custom Turbopack rules are needed (Turbopack handles
  // node: URI imports natively).
  turbopack: {},
};

export default nextConfig;
