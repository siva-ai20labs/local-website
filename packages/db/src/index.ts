import type { D1Database } from "@cloudflare/workers-types";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Build a Prisma client bound to a Cloudflare D1 database.
 *
 * IMPORTANT: call this inside a request handler with `env.DB`, never at module
 * scope. The Workers runtime forbids reusing a client (and its I/O) across
 * different requests ("Cannot perform I/O on behalf of a different request").
 */
export function getPrisma(db: D1Database): PrismaClient {
  return new PrismaClient({ adapter: new PrismaD1(db) });
}

export { PrismaClient };
export * from "./generated/prisma/client";
