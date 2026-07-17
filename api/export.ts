// GET /api/export — full account dump for GDPR export (M5 task 5.9, SEC-3).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../src/server/auth';
import { db } from '../src/server/db/client';
import { profiles, history, phrasebook } from '../src/server/db/schema';
import type { AccountExport, ApiError, HistoryEntry } from '../src/lib/api/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' } satisfies ApiError);
    return;
  }

  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  const [profileRow] = await db.select().from(profiles).where(eq(profiles.clerkUserId, clerkUserId)).limit(1);
  if (!profileRow) {
    res.status(404).json({ error: 'Profile not found' } satisfies ApiError);
    return;
  }

  const historyRows = await db.select().from(history).where(eq(history.clerkUserId, clerkUserId));
  const phrasebookRows = await db.select().from(phrasebook).where(eq(phrasebook.clerkUserId, clerkUserId));

  const historyEntries: HistoryEntry[] = historyRows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    text: row.text,
    type: row.type as HistoryEntry['type'],
    conf: row.conf ?? undefined,
    saved: row.saved,
    languageCode: row.languageCode as HistoryEntry['languageCode'],
  }));

  const phrasebookMap: Record<string, string[]> = {};
  for (const row of phrasebookRows) {
    (phrasebookMap[row.category] ??= []).push(row.phrase);
  }

  const body: AccountExport = {
    profile: {
      firstName: profileRow.firstName,
      lastName: profileRow.lastName,
      email: profileRow.email,
      plan: 'Free plan',
      role: profileRow.role as AccountExport['profile']['role'],
      primaryLanguage: profileRow.primaryLanguage as AccountExport['profile']['primaryLanguage'],
    },
    history: historyEntries,
    phrasebook: phrasebookMap,
    exportedAt: new Date().toISOString(),
  };

  res.status(200).json(body);
}
