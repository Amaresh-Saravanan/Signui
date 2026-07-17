// DELETE /api/account — purge all rows for the user (M5 task 5.9, SEC-3).
// history/phrasebook/reports cascade-delete via FK ON DELETE CASCADE
// (see src/server/db/schema.ts); deleting the profile row is sufficient.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../src/server/auth';
import { db } from '../src/server/db/client';
import { profiles } from '../src/server/db/schema';
import type { ApiError } from '../src/lib/api/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' } satisfies ApiError);
    return;
  }

  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  await db.delete(profiles).where(eq(profiles.clerkUserId, clerkUserId));

  res.status(200).json({ ok: true });
}
