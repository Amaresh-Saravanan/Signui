// DELETE /api/history/:id (M5). Scoped to the authenticated clerkUserId —
// deleting another user's row is a no-op (0 rows affected), never an error
// leak.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { and, eq } from 'drizzle-orm';
import { requireAuth } from '../../src/server/auth';
import { db } from '../../src/server/db/client';
import { history } from '../../src/server/db/schema';
import type { ApiError } from '../../src/lib/api/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' } satisfies ApiError);
    return;
  }

  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  const idParam = req.query.id;
  const id = Number(Array.isArray(idParam) ? idParam[0] : idParam);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR' } satisfies ApiError);
    return;
  }

  await db.delete(history).where(and(eq(history.id, id), eq(history.clerkUserId, clerkUserId)));

  res.status(200).json({ ok: true });
}
