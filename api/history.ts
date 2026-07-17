// GET (cursor-paginated) / POST /api/history (M5). Scoped to the
// authenticated clerkUserId only.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { and, desc, eq, lt } from 'drizzle-orm';
import { requireAuth } from '../src/server/auth';
import { db } from '../src/server/db/client';
import { history } from '../src/server/db/schema';
import type { ApiError, HistoryEntry, HistoryPage } from '../src/lib/api/types';

const PAGE_SIZE = 20;

const historyEntrySchema = z.object({
  id: z.number(),
  timestamp: z.number(),
  text: z.string().min(1).max(2000),
  type: z.enum(['sign-to-text', 'text-to-sign']),
  conf: z.number().min(0).max(1).optional(),
  saved: z.boolean(),
  languageCode: z.enum(['ISL', 'ASL', 'BSL']),
});

function toApiEntry(row: typeof history.$inferSelect): HistoryEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    text: row.text,
    type: row.type as HistoryEntry['type'],
    conf: row.conf ?? undefined,
    saved: row.saved,
    languageCode: row.languageCode as HistoryEntry['languageCode'],
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clerkUserId = await requireAuth(req, res);
  if (!clerkUserId) return;

  if (req.method === 'GET') {
    const cursorRaw = req.query.cursor;
    const cursor = typeof cursorRaw === 'string' ? Number(cursorRaw) : null;
    const hasCursor = cursor !== null && Number.isFinite(cursor);

    const rows = await db
      .select()
      .from(history)
      .where(
        hasCursor
          ? and(eq(history.clerkUserId, clerkUserId), lt(history.id, cursor as number))
          : eq(history.clerkUserId, clerkUserId)
      )
      .orderBy(desc(history.id))
      .limit(PAGE_SIZE + 1);

    const page = rows.slice(0, PAGE_SIZE);
    const nextCursor = rows.length > PAGE_SIZE ? String(page[page.length - 1].id) : null;

    const body: HistoryPage = {
      entries: page.map(toApiEntry),
      nextCursor,
    };
    res.status(200).json(body);
    return;
  }

  if (req.method === 'POST') {
    const parsed = historyEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid history entry', code: 'VALIDATION_ERROR' } satisfies ApiError);
      return;
    }

    const [row] = await db
      .insert(history)
      .values({
        clerkUserId,
        text: parsed.data.text,
        type: parsed.data.type,
        conf: parsed.data.conf,
        saved: parsed.data.saved,
        languageCode: parsed.data.languageCode,
        timestamp: parsed.data.timestamp,
      })
      .returning({ id: history.id });

    res.status(201).json({ id: row.id });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' } satisfies ApiError);
}
