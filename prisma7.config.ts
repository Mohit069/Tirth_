// Prisma CLI config (migrations, generate). The app's own connection is in src/lib/db.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection. Hosted databases give a
    // separate "direct" URL for this; locally DATABASE_URL is already direct.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
    // Only for the local `prisma dev` server, which runs its shadow database on its own port.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"] || undefined,
  },
});
