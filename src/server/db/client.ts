// Neon serverless drizzle client (M5 task 5.3). One shared instance per
// function invocation — neon-http is stateless/fetch-based so this is safe
// to reuse across warm lambda invocations.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
