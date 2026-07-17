// Clerk session verification helper (M5 task 5.3).
// Every /api handler calls requireAuth(req) first; a null return means the
// caller already sent 401 and the handler must stop.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import type { ApiError } from '../lib/api/types';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

/**
 * Verifies the `Authorization: Bearer <token>` header against Clerk and
 * returns the authenticated clerkUserId, or null (having already written a
 * 401 ApiError to `res`) if the request is unauthenticated.
 *
 * Assumption (double-check): tokens are verified via network JWKS lookup
 * (no CLERK_JWT_KEY / networkless mode configured) — simplest correct setup
 * for a serverless function; add CLERK_JWT_KEY only if cold-start latency
 * from the JWKS fetch becomes a measured problem.
 */
export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const header = req.headers.authorization;
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : null;

  if (!token || !CLERK_SECRET_KEY) {
    res.status(401).json({ error: 'Unauthorized' } satisfies ApiError);
    return null;
  }

  try {
    const { data, errors } = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    // `sub` (the Clerk user id) is a standard JWT claim; type it defensively
    // since @clerk/backend's payload type varies across versions.
    const sub = (data as { sub?: string } | undefined)?.sub;
    if (errors || !sub) {
      res.status(401).json({ error: 'Unauthorized' } satisfies ApiError);
      return null;
    }
    return sub;
  } catch {
    res.status(401).json({ error: 'Unauthorized' } satisfies ApiError);
    return null;
  }
}
