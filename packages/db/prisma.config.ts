import { defineConfig } from "prisma/config";

// Prisma 7 requires the datasource URL to live here (not in schema.prisma).
// This SQLite file is only used by Prisma CLI tooling (generate / migrate diff)
// — at runtime the Cloudflare D1 binding supplies the real connection via the
// driver adapter passed to `new PrismaClient({ adapter })`.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "file:./prisma/.tooling.db",
  },
});
