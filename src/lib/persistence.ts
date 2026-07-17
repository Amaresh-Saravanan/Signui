import { z } from 'zod';

// Mirrors AppDataState in src/context/AppDataContext.tsx.
// Duplicated intentionally (not imported) so this module has zero dependency
// on the context — Agent 2 wires the two together.

const signLanguageCode = z.enum(['ISL', 'ASL', 'BSL']);

const userProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  plan: z.literal('Free plan'),
  role: z.enum(['deaf', 'hearing', 'interpreter']),
  primaryLanguage: signLanguageCode,
});

const appPreferencesSchema = z.object({
  notifications: z.boolean(),
  localOnly: z.boolean(),
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
});

const historyEntrySchema = z.object({
  id: z.number(),
  timestamp: z.number(),
  text: z.string(),
  type: z.enum(['sign-to-text', 'text-to-sign']),
  conf: z.number().optional(),
  saved: z.boolean(),
  languageCode: signLanguageCode,
});

export const appDataSchema = z.object({
  user: userProfileSchema,
  preferences: appPreferencesSchema,
  history: z.array(historyEntrySchema),
  phrasebook: z.record(z.string(), z.array(z.string())),
  reportsCount: z.number(),
  session: z.object({ email: z.string() }).nullable(),
  onboardingComplete: z.boolean(),
  consentAcknowledged: z.boolean(),
});

export type AppDataState = z.infer<typeof appDataSchema>;

const STORAGE_KEY = 'signbridge.appData.v1';
const CURRENT_VERSION = 2;

export const DEFAULT_STATE: AppDataState = {
  user: {
    firstName: 'New',
    lastName: 'User',
    email: '',
    plan: 'Free plan',
    role: 'deaf',
    primaryLanguage: 'ASL',
  },
  preferences: {
    notifications: true,
    localOnly: true,
    reduceMotion: false,
    highContrast: false,
  },
  history: [],
  phrasebook: {
    Greetings: [],
    Emergencies: [],
    Travel: [],
    Daily: [],
    Saved: [],
  },
  reportsCount: 0,
  session: null,
  onboardingComplete: false,
  consentAcknowledged: false,
};

// --- Versioned migration -----------------------------------------------
// Each entry migrates the *unvalidated* JSON blob from `from` version to
// `from + 1`. Applied sequentially until CURRENT_VERSION, then handed to
// the zod schema for validation. Data with no `schemaVersion` is treated
// as v1 (pre-migration shape).
//
// ponytail: v1→v2 is a no-op shape change today (nothing to migrate yet).
// It exists to prove the mechanism works before it's ever load-bearing —
// add v2→v3 the same way when a real shape change lands.
type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, Migration> = {
  1: (data) => data,
};

function migrate(data: Record<string, unknown>): Record<string, unknown> {
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 1;
  let result = data;
  while (version < CURRENT_VERSION) {
    const step = migrations[version];
    if (!step) break; // no path forward; validation below will reject/reset
    result = step(result);
    version += 1;
  }
  return result;
}

/**
 * Reads, migrates, and validates persisted state. Never throws — any
 * failure (missing key, corrupt JSON, failed migration, schema mismatch)
 * safe-resets to the whole DEFAULT_STATE. Individual fields are never
 * dropped piecemeal; it's all-default or all-validated.
 */
export function loadState(): AppDataState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const migrated = migrate(parsed);
    const result = appDataSchema.safeParse(migrated);
    if (!result.success) return DEFAULT_STATE;

    return result.data;
  } catch {
    return DEFAULT_STATE;
  }
}

/**
 * Debounced localStorage writer (trailing edge). Coalesces rapid state
 * changes into a single setItem call ~delayMs after the last write().
 * flush() writes synchronously and cancels any pending timer — call it
 * from beforeunload so the last state isn't lost.
 */
export function createDebouncedWriter(delayMs = 250) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: AppDataState | null = null;

  const writeNow = (state: AppDataState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: CURRENT_VERSION }));
    } catch {
      // quota exceeded / private-mode — drop the write, nothing else to do
    }
  };

  return {
    write(state: AppDataState) {
      pending = state;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (pending) writeNow(pending);
        pending = null;
      }, delayMs);
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (pending) {
        writeNow(pending);
        pending = null;
      }
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
    },
  };
}

// --- Integration notes for AppDataContext (Agent 2) ---------------------
//
// Replace `safeLoadState()` with `loadState()` from this module:
//
//   import { loadState, createDebouncedWriter, DEFAULT_STATE } from '../lib/persistence';
//   const [state, setState] = useState<AppDataState>(() => loadState());
//
// Replace the inline synchronous write in `commit()` with the debounced
// writer (create one instance outside the component or via useRef/useMemo
// so it persists across renders):
//
//   const writerRef = useRef(createDebouncedWriter());
//   const commit = (next: AppDataState) => {
//     setState(next);
//     writerRef.current.write(next);
//   };
//
// Call `writerRef.current.flush()` in a `beforeunload` listener (and in
// `signOut`, before the `localStorage.removeItem`) so no trailing debounced
// write races the removal. DEFAULT_STATE is exported from here too, so
// AppDataContext's local copy can be deleted if desired — not required.
