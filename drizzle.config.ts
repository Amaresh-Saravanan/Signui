import type { Config } from 'drizzle-kit';

// Drizzle Kit config for the Neon Postgres schema (M5, task 5.3).
// Run `npx drizzle-kit generate` to emit SQL migrations from src/server/db/schema.ts,
// and `npx drizzle-kit migrate` to apply them against DATABASE_URL.
export default {
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
