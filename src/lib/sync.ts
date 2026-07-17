// Optimistic sync queue (TDD §7.2: "POST /api/history — last-write-wins").
//
// Caller (AppDataContext, owned by Agent 2) already applies the mutation to
// local state before calling enqueue() — this module only replays it to the
// server, and asks the caller to roll back on a definitive server rejection.
//
// WIRING (for Agent 2, in AppDataContext.tsx):
//   const queue = createSyncQueue({ apiClient, onRollback: (op) => { ...revert... } });
//   - addHistoryEntry(entry)     → after commit(), queue.enqueue({ kind: 'addHistory', entry: newEntry })
//       onRollback: removeHistoryEntry(newEntry.id) equivalent (drop it from local state)
//   - removeHistoryEntry(id)     → after commit(), queue.enqueue({ kind: 'deleteHistory', id })
//       onRollback: re-insert the removed entry (caller must snapshot it before commit)
//   - updateUserProfile(updates) → after commit(), queue.enqueue({ kind: 'updateProfile', patch: updates })
//       onRollback: restore the previous profile snapshot (caller must snapshot it before commit)
//   toggleSaved/addPhrase/etc. are local-only (phrasebook has no endpoint in ApiContract) — do not enqueue those.
//
// Ops are serialized (one in flight at a time) so history/profile writes land
// in the order they were made — required for last-write-wins semantics.
//
// Offline handling: a network failure (fetch rejects, no HTTP status) keeps the
// op at the front of the queue and stops draining; the next enqueue() call or
// an 'online' event resumes the drain. A server rejection (ApiRequestError,
// has a status) is definitive — the op is dropped and onRollback fires.

import { ApiRequestError } from './apiClient';
import type { ApiClient } from './apiClient';
import type { ApiUserProfile, HistoryEntry } from './api/types';

export type SyncOp =
  | { kind: 'addHistory'; entry: HistoryEntry }
  | { kind: 'deleteHistory'; id: number }
  | { kind: 'updateProfile'; patch: Partial<ApiUserProfile> };

interface CreateSyncQueueOptions {
  apiClient: ApiClient;
  /** Called when the server definitively rejects an op (4xx/5xx). Caller
   *  reverts whatever optimistic local change it made for this op. */
  onRollback: (op: SyncOp) => void;
}

async function send(apiClient: ApiClient, op: SyncOp): Promise<void> {
  switch (op.kind) {
    case 'addHistory':
      await apiClient.postHistory(op.entry);
      return;
    case 'deleteHistory':
      await apiClient.deleteHistory(op.id);
      return;
    case 'updateProfile':
      await apiClient.updateProfile(op.patch);
      return;
  }
}

export function createSyncQueue({ apiClient, onRollback }: CreateSyncQueueOptions) {
  // ponytail: in-memory only — a reload loses unsynced ops from the queue.
  // Local state (already committed to localStorage by the caller) is not lost,
  // so this is divergence-from-server, not data loss. Upgrade path: persist
  // the queue array to localStorage too, if offline durability across reloads
  // becomes a real requirement.
  const queue: SyncOp[] = [];
  let draining = false;

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length > 0) {
        const op = queue[0];
        try {
          await send(apiClient, op);
          queue.shift();
        } catch (err) {
          if (err instanceof ApiRequestError) {
            // Server rejected the op — not retryable. Drop it and let the
            // caller revert local state.
            queue.shift();
            onRollback(op);
          } else {
            // Network failure (offline) — leave op queued, stop draining,
            // retry later. Never treated as rollback-worthy.
            break;
          }
        }
      }
    } finally {
      draining = false;
    }
  }

  function enqueue(op: SyncOp) {
    queue.push(op);
    void drain();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void drain());
  }

  return { enqueue, _queueLength: () => queue.length };
}
