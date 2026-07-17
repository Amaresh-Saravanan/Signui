// Shared API contract (TDD §7.2). Single source of truth for the /api surface —
// both the Vercel Functions (server) and the browser apiClient import these, so
// the request/response shapes can never drift between the two sides.
//
// PRIVACY INVARIANT (BE-5/SEC-2): no endpoint ever accepts frames/video/landmarks.
// Only profile / history / phrasebook / reports metadata crosses the wire.

import type {
  HistoryEntry,
  SignLanguageCode,
  TranslationMode,
} from '../../context/AppDataContext';

export type { HistoryEntry, SignLanguageCode, TranslationMode };

/** Mirrors UserProfile in AppDataContext (kept in sync deliberately). */
export interface ApiUserProfile {
  firstName: string;
  lastName: string;
  email: string;
  plan: 'Free plan';
  role: 'deaf' | 'hearing' | 'interpreter';
  primaryLanguage: SignLanguageCode;
}

/** POST /api/reports — error/quality report. NEVER carries a frame or landmark. */
export interface ReportPayload {
  text: string;
  letter?: string;
  confidence?: number;
  language: SignLanguageCode;
  appVersion: string;
}

/** GET /api/history?cursor= — cursor-paginated history page. */
export interface HistoryPage {
  entries: HistoryEntry[];
  nextCursor: string | null;
}

/** Full account dump for GDPR export (GET /api/export, SEC-3). */
export interface AccountExport {
  profile: ApiUserProfile;
  history: HistoryEntry[];
  phrasebook: Record<string, string[]>;
  exportedAt: string; // ISO 8601
}

/** Uniform error body every endpoint returns on failure. */
export interface ApiError {
  error: string;
  code?: string;
}

/**
 * The /api contract, expressed as a type so the client and server can be checked
 * against the same shape. Method + path are documentation; the compiler enforces
 * the request/response bodies.
 */
export interface ApiContract {
  'POST /api/reports': { body: ReportPayload; response: { id: string } };
  'GET /api/profile': { body: never; response: ApiUserProfile };
  'PUT /api/profile': { body: Partial<ApiUserProfile>; response: ApiUserProfile };
  'GET /api/history': { body: never; response: HistoryPage };
  'POST /api/history': { body: HistoryEntry; response: { id: number } };
  'DELETE /api/history/:id': { body: never; response: { ok: true } };
  'GET /api/export': { body: never; response: AccountExport };
  'DELETE /api/account': { body: never; response: { ok: true } };
}
