// POST /api/reports — error/quality report (M5 task 5.8). Metadata only, per
// PRIVACY INVARIANT: no frames/video/landmarks ever accepted.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from '../src/server/auth';
import { db } from '../src/server/db/client';
import { reports } from '../src/server/db/schema';
import type { ApiError } from '../src/lib/api/types';

const reportSchema = z.object({
  text: z.string().min(1).max(2000),
  letter: z.string().max(8).optional(),
  confidence: z.number().min(0).max(1).optional(),
  language: z.enum(['ISL', 'ASL', 'BSL']),
  appVersion: z.string().min(1).max(50),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' } satisfies ApiError);
    return;
  }

  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid report payload', code: 'VALIDATION_ERROR' } satisfies ApiError);
    return;
  }

  const [row] = await db
    .insert(reports)
    .values({
      clerkUserId,
      text: parsed.data.text,
      letter: parsed.data.letter,
      confidence: parsed.data.confidence,
      language: parsed.data.language,
      appVersion: parsed.data.appVersion,
    })
    .returning({ id: reports.id });

  res.status(201).json({ id: row.id });
}
