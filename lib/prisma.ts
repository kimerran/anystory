import { PrismaClient } from "@/app/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/** Prisma client singleton — reused across hot-reloads in development. */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
