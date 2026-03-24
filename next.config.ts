import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js/webpack from bundling Prisma's server-only runtime,
  // which uses node: URI imports (node:crypto, node:path, etc.).
  serverExternalPackages: ["@prisma/client", "prisma"],
  webpack: (config) => {
    // Handle node: URI scheme imports used by Prisma v7 and other modern packages.
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
        if (request?.startsWith("node:")) {
          return callback(null, `commonjs ${request.slice(5)}`);
        }
        callback();
      },
    ];
    return config;
  },
};

export default nextConfig;
