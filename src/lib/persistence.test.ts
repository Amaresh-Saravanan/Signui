import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadState, createDebouncedWriter, DEFAULT_STATE, appDataSchema } from './persistence';

const STORAGE_KEY = 'signbridge.appData.v1';

// ponytail: no jsdom in this project's test env (see useSignDetector.test.ts —
// pure-function style), so stub the tiny bit of the Storage interface this
// module actually uses instead of pulling in a DOM environment dependency.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

vi.stubGlobal('localStorage', new MemoryStorage());

beforeEach(() => {
  localStorage.clear();
});

describe('loadState', () => {
  it('returns DEFAULT_STATE when nothing is stored', () => {
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it('round-trips a valid saved state', () => {
    const state = {
      ...DEFAULT_STATE,
      user: { ...DEFAULT_STATE.user, firstName: 'Amaresh' },
      reportsCount: 3,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: 2 }));

    expect(loadState()).toEqual(state);
  });

  it('safe-resets to DEFAULT_STATE on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it('safe-resets to DEFAULT_STATE (whole default, not per-field patch) when required fields are missing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: { firstName: 'X' } }));
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it('safe-resets on schema violation (wrong type)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_STATE, reportsCount: 'not-a-number', schemaVersion: 2 })
    );
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it('migrates unversioned (v1) data forward and validates it', () => {
    // No schemaVersion field at all == legacy v1 shape.
    const legacy = { ...DEFAULT_STATE, reportsCount: 5 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    expect(loadState()).toEqual(legacy);
  });

  it('accepts data already validated by appDataSchema', () => {
    expect(() => appDataSchema.parse(DEFAULT_STATE)).not.toThrow();
  });
});

describe('createDebouncedWriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid writes into a single setItem after the delay', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem');
    const writer = createDebouncedWriter(250);

    writer.write({ ...DEFAULT_STATE, reportsCount: 1 });
    writer.write({ ...DEFAULT_STATE, reportsCount: 2 });
    writer.write({ ...DEFAULT_STATE, reportsCount: 3 });

    expect(setItemSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const [, value] = setItemSpy.mock.calls[0];
    expect(JSON.parse(value).reportsCount).toBe(3);

    setItemSpy.mockRestore();
  });

  it('flush() writes immediately and cancels the pending timer', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem');
    const writer = createDebouncedWriter(250);

    writer.write({ ...DEFAULT_STATE, reportsCount: 9 });
    writer.flush();

    expect(setItemSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(250);
    expect(setItemSpy).toHaveBeenCalledTimes(1); // no double-write

    setItemSpy.mockRestore();
  });

  it('cancel() drops the pending write', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem');
    const writer = createDebouncedWriter(250);

    writer.write({ ...DEFAULT_STATE, reportsCount: 9 });
    writer.cancel();

    vi.advanceTimersByTime(250);
    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  it('does not throw if setItem fails (quota/private-mode)', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const writer = createDebouncedWriter(250);

    writer.write(DEFAULT_STATE);
    expect(() => vi.advanceTimersByTime(250)).not.toThrow();

    setItemSpy.mockRestore();
  });
});
