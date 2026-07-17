import { describe, it, expect, vi } from 'vitest';
import { createSyncQueue } from './sync';
import { ApiRequestError } from './apiClient';
import type { ApiClient } from './apiClient';
import type { HistoryEntry } from './api/types';

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const entry: HistoryEntry = {
  id: 1,
  timestamp: Date.now(),
  text: 'HELLO',
  type: 'sign-to-text',
  saved: false,
  languageCode: 'ASL',
};

describe('createSyncQueue', () => {
  it('sends a successful op and does not roll back', async () => {
    const postHistory = vi.fn().mockResolvedValue({ id: 1 });
    const apiClient = { postHistory } as unknown as ApiClient;
    const onRollback = vi.fn();
    const queue = createSyncQueue({ apiClient, onRollback });

    queue.enqueue({ kind: 'addHistory', entry });
    await flushMicrotasks();

    expect(postHistory).toHaveBeenCalledWith(entry);
    expect(onRollback).not.toHaveBeenCalled();
    expect(queue._queueLength()).toBe(0);
  });

  it('rolls back and drops the op on a server rejection', async () => {
    const postHistory = vi.fn().mockRejectedValue(new ApiRequestError(400, { error: 'bad request' }));
    const apiClient = { postHistory } as unknown as ApiClient;
    const onRollback = vi.fn();
    const queue = createSyncQueue({ apiClient, onRollback });

    queue.enqueue({ kind: 'addHistory', entry });
    await flushMicrotasks();

    expect(onRollback).toHaveBeenCalledWith({ kind: 'addHistory', entry });
    expect(queue._queueLength()).toBe(0);
  });

  it('keeps the op queued (no rollback) on a network failure, and retries on next enqueue', async () => {
    const postHistory = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ id: 1 });
    const apiClient = { postHistory } as unknown as ApiClient;
    const onRollback = vi.fn();
    const queue = createSyncQueue({ apiClient, onRollback });

    queue.enqueue({ kind: 'addHistory', entry });
    await flushMicrotasks();

    expect(onRollback).not.toHaveBeenCalled();
    expect(queue._queueLength()).toBe(1); // still queued, not lost

    // Next enqueue (or an 'online' event) resumes the drain.
    const entry2: HistoryEntry = { ...entry, id: 2 };
    queue.enqueue({ kind: 'addHistory', entry: entry2 });
    await flushMicrotasks();

    expect(postHistory).toHaveBeenCalledTimes(3); // 1 fail + 2 successes (retry + new op)
    expect(queue._queueLength()).toBe(0);
  });
});
