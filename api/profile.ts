// GET/PUT /api/profile (M5). Scoped to the authenticated clerkUserId only.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../src/server/auth';
import { db } from '../src/server/db/client';
import { profiles } from '../src/server/db/schema';
import type { ApiError, ApiUserProfile } from '../src/lib/api/types';

const profileUpdateSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    role: z.enum(['deaf', 'hearing', 'interpreter']),
    primaryLanguage: z.enum(['ISL', 'ASL', 'BSL']),
  })
  .partial();

function toApiProfile(row: typeof profiles.$inferSelect): ApiUserProfile {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    plan: 'Free plan',
    role: row.role as ApiUserProfile['role'],
    primaryLanguage: row.primaryLanguage as ApiUserProfile['primaryLanguage'],
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  if (req.method === 'GET') {
    const [row] = await db.select().from(profiles).where(eq(profiles.clerkUserId, clerkUserId)).limit(1);
    if (!row) {
      res.status(404).json({ error: 'Profile not found' } satisfies ApiError);
      return;
    }
    res.status(200).json(toApiProfile(row));
    return;
  }

  if (req.method === 'PUT') {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid profile payload', code: 'VALIDATION_ERROR' } satisfies ApiError);
      return;
    }

    const [existing] = await db.select().from(profiles).where(eq(profiles.clerkUserId, clerkUserId)).limit(1);

    let row: typeof profiles.$inferSelect;
    if (existing) {
      [row] = await db
        .update(profiles)
        .set(parsed.data)
        .where(eq(profiles.clerkUserId, clerkUserId))
        .returning();
    } else {
      [row] = await db
        .insert(profiles)
        .values({
          clerkUserId,
          firstName: parsed.data.firstName ?? 'New',
          lastName: parsed.data.lastName ?? 'User',
          email: parsed.data.email ?? '',
          role: parsed.data.role ?? 'deaf',
          primaryLanguage: parsed.data.primaryLanguage ?? 'ASL',
        })
        .returning();
    }

    res.status(200).json(toApiProfile(row));
    return;
  }

  res.status(405).json({ error: 'Method not allowed' } satisfies ApiError);
}
