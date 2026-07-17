// Typed same-origin fetch wrapper over the /api contract (docs/TDD.md §7.2).
//
// Auth-agnostic by design: callers pass a `getToken` callback that resolves the
// Clerk Bearer token. This module never imports Clerk directly (Agent 2 injects
// the token getter), so it stays testable and decoupled from the auth provider.
//
// PRIVACY INVARIANT (BE-5/SEC-2): every request body here is one of the types in
// src/lib/api/types.ts — none of them can carry frames/video/landmarks.

import type {
  AccountExport,
  ApiError,
  ApiUserProfile,
  HistoryEntry,
  HistoryPage,
  ReportPayload,
} from './api/types';

export type GetToken = () => Promise<string | null>;

/** Thrown on any non-2xx response. Carries the parsed ApiError body + status so
 *  callers (sync.ts) can distinguish "server rejected" from "network is down"
 *  (a plain fetch rejection, which has no `status`). */
export class ApiRequestError extends Error {
  status: number;
  body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.error || `Request failed with status ${status}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  getToken: GetToken,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Same-origin only — never a third-party host (privacy invariant).
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    throw new ApiRequestError(res.status, (data as ApiError) ?? { error: res.statusText });
  }
  return data as T;
}

export function createApiClient(getToken: GetToken) {
  return {
    getProfile: () => request<ApiUserProfile>(getToken, 'GET', '/profile'),

    updateProfile: (patch: Partial<ApiUserProfile>) =>
      request<ApiUserProfile>(getToken, 'PUT', '/profile', patch),

    getHistory: (cursor?: string | null) =>
      request<HistoryPage>(
        getToken,
        'GET',
        `/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      ),

    postHistory: (entry: HistoryEntry) =>
      request<{ id: number }>(getToken, 'POST', '/history', entry),

    deleteHistory: (id: number) =>
      request<{ ok: true }>(getToken, 'DELETE', `/history/${id}`),

    postReport: (payload: ReportPayload) =>
      request<{ id: string }>(getToken, 'POST', '/reports', payload),

    exportAccount: () => request<AccountExport>(getToken, 'GET', '/export'),

    deleteAccount: () => request<{ ok: true }>(getToken, 'DELETE', '/account'),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
