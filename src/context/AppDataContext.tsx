import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { isLanguageAvailable } from '../constants/languages';
import { loadState, createDebouncedWriter } from '../lib/persistence';
import { initTelemetry } from '../lib/telemetry';
import { createApiClient } from '../lib/apiClient';
import { createSyncQueue } from '../lib/sync';
import type { SyncOp } from '../lib/sync';
import { getClerkToken, clerkSignOut, hasClerk } from '../lib/clerk';

export type SignLanguageCode = 'ISL' | 'ASL' | 'BSL';
export type TranslationMode = 'sign-to-text' | 'text-to-sign';

export interface HistoryEntry {
  id: number;
  timestamp: number;
  text: string;
  type: TranslationMode;
  conf?: number;
  saved: boolean;
  languageCode: SignLanguageCode;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  plan: 'Free plan';
  role: 'deaf' | 'hearing' | 'interpreter';
  primaryLanguage: SignLanguageCode;
}

interface AppPreferences {
  notifications: boolean;
  localOnly: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  heatmap: boolean;
  lowLight: boolean;
}

interface AppDataState {
  user: UserProfile;
  preferences: AppPreferences;
  history: HistoryEntry[];
  phrasebook: Record<string, string[]>;
  reportsCount: number;
  /** Client-side session. Null = signed out. Replace with a real token/session
   *  when a backend lands (see docs/REQUIREMENTS.md BE-1); this is the seam. */
  session: { email: string } | null;
  onboardingComplete: boolean;
  consentAcknowledged: boolean;
}

interface AppDataContextValue {
  state: AppDataState;
  isAuthenticated: boolean;
  signIn: (fullName: string, email: string) => void;
  completeOnboarding: () => void;
  acknowledgeConsent: () => void;
  exportData: () => string;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  updatePreferences: (updates: Partial<AppPreferences>) => void;
  setPrimaryLanguage: (language: SignLanguageCode) => void;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'saved'> & { saved?: boolean }) => number | null;
  signOut: () => void;
  toggleSaved: (id: number) => void;
  removeHistoryEntry: (id: number) => void;
  clearHistory: () => void;
  addPhrase: (category: string, phrase: string) => void;
  removePhrase: (category: string, phrase: string) => void;
  incrementReports: () => void;
  stats: {
    totalTranslations: number;
    savedPhrases: number;
    totalHoursTranslated: number;
    avgConfidence: number;
    currentStreakDays: number;
    bestStreakDays: number;
    lastSessionAgoLabel: string;
    activeMinutesToday: number;
    weeklyCounts: number[];
    languageDistribution: Record<SignLanguageCode, number>;
  };
}

const STORAGE_KEY = 'signbridge.appData.v1';

const DEFAULT_STATE: AppDataState = {
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
    heatmap: false,
    lowLight: false,
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

const AppDataContext = createContext<AppDataContextValue | null>(null);

// Persistence (load + validate + migrate) now lives in ../lib/persistence
// (loadState). The old inline safeLoadState was replaced by that hardened,
// zod-validated, versioned loader (M5 task 5.4).

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

function calculateStreak(days: number[]): { current: number; best: number } {
  if (days.length === 0) return { current: 0, best: 0 };
  const sorted = [...days].sort((a, b) => a - b);
  let best = 1;
  let currentRun = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 86400000) {
      currentRun++;
      if (currentRun > best) best = currentRun;
    } else {
      currentRun = 1;
    }
  }

  const today = startOfDay(Date.now());
  let current = 0;
  if (sorted.includes(today)) {
    current = 1;
    let cursor = today - 86400000;
    while (sorted.includes(cursor)) {
      current++;
      cursor -= 86400000;
    }
  }

  return { current, best };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(() => loadState());

  // Debounced localStorage writer (M5 task 5.5) — coalesces rapid mutations
  // into one setItem ~250ms after the last change instead of writing inline
  // on every keystroke.
  const writerRef = useRef(createDebouncedWriter());

  const commit = (next: AppDataState) => {
    setState(next);
    writerRef.current.write(next);
  };

  // Functional revert used by sync rollback — reads the latest state, applies
  // the reverting change, and persists it (avoids stale-closure bugs).
  const applyRevert = (updater: (prev: AppDataState) => AppDataState) => {
    setState((prev) => {
      const next = updater(prev);
      writerRef.current.write(next);
      return next;
    });
  };

  // --- Cross-device sync (M5 task 5.6) --------------------------------------
  // Dormant until Clerk is configured (hasClerk): without a session token every
  // request would 401 and wrongly roll back local edits, so we simply don't
  // enqueue. With Clerk + a deployed /api, ops replay optimistically and only a
  // definitive server rejection rolls the local change back.
  const deletedSnapshots = useRef(new Map<number, HistoryEntry>());
  const profileSnapshots = useRef<UserProfile[]>([]);

  const syncRef = useRef(
    createSyncQueue({
      apiClient: createApiClient(getClerkToken),
      onRollback: (op: SyncOp) => {
        if (op.kind === 'addHistory') {
          applyRevert((prev) => ({
            ...prev,
            history: prev.history.filter((h) => h.id !== op.entry.id),
          }));
        } else if (op.kind === 'deleteHistory') {
          const snap = deletedSnapshots.current.get(op.id);
          deletedSnapshots.current.delete(op.id);
          if (snap) {
            applyRevert((prev) => ({ ...prev, history: [snap, ...prev.history] }));
          }
        } else if (op.kind === 'updateProfile') {
          const prevProfile = profileSnapshots.current.shift();
          if (prevProfile) {
            applyRevert((prev) => ({ ...prev, user: prevProfile }));
          }
        }
      },
    }),
  );

  const enqueueSync = (op: SyncOp) => {
    if (hasClerk) syncRef.current.enqueue(op);
  };

  // --- Telemetry (M5 task 5.10) ---------------------------------------------
  // Self-gates to a no-op unless a DSN is set AND consent given AND localOnly
  // off. Re-runs when those flags change.
  useEffect(() => {
    initTelemetry({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      consentAcknowledged: state.consentAcknowledged,
      localOnly: state.preferences.localOnly,
    });
  }, [state.consentAcknowledged, state.preferences.localOnly]);

  // Flush any pending debounced write before the tab unloads so the last
  // mutation isn't lost.
  useEffect(() => {
    const flush = () => writerRef.current.flush();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const signIn = (fullName: string, email: string) => {
    // Backend seam (BE-1): a real implementation would exchange credentials for
    // a session token here. For now we establish a local session only.
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? 'New';
    const lastName = parts.slice(1).join(' ') || 'User';
    commit({
      ...state,
      user: {
        ...state.user,
        firstName,
        lastName,
        email,
      },
      session: { email },
    });
  };

  const completeOnboarding = () => {
    commit({ ...state, onboardingComplete: true });
  };

  const acknowledgeConsent = () => {
    commit({ ...state, consentAcknowledged: true });
  };

  const exportData = () => {
    // SEC-3: user can export all locally-held data.
    return JSON.stringify(state, null, 2);
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    if (hasClerk) profileSnapshots.current.push(state.user);
    commit({
      ...state,
      user: {
        ...state.user,
        ...updates,
      },
    });
    enqueueSync({ kind: 'updateProfile', patch: updates });
  };

  const updatePreferences = (updates: Partial<AppPreferences>) => {
    commit({
      ...state,
      preferences: {
        ...state.preferences,
        ...updates,
      },
    });
  };

  const setPrimaryLanguage = (language: SignLanguageCode) => {
    commit({
      ...state,
      user: {
        ...state.user,
        primaryLanguage: language,
      },
    });
  };

  const addPhrase = (category: string, phrase: string) => {
    const clean = phrase.trim();
    if (!clean) return;

    const current = state.phrasebook[category] ?? [];
    if (current.includes(clean)) return;

    commit({
      ...state,
      phrasebook: {
        ...state.phrasebook,
        [category]: [...current, clean],
      },
    });
  };

  const removePhrase = (category: string, phrase: string) => {
    const current = state.phrasebook[category] ?? [];
    commit({
      ...state,
      phrasebook: {
        ...state.phrasebook,
        [category]: current.filter((p) => p !== phrase),
      },
    });
  };

  const addHistoryEntry = (entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'saved'> & { saved?: boolean }) => {
    // ML-5: never record a translation under a language that has no shipped
    // model, so history/analytics can't accrue fake ISL/BSL data.
    if (!isLanguageAvailable(entry.languageCode)) return null;

    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      saved: entry.saved ?? false,
    };

    commit({
      ...state,
      history: [newEntry, ...state.history],
    });
    enqueueSync({ kind: 'addHistory', entry: newEntry });
    return newEntry.id;
  };

  const signOut = () => {
    // FR-10: fully clear the session — reset in-memory state and wipe the
    // persisted blob so a signed-out user is not still "logged in" on return.
    // Cancel any pending debounced write first so it can't re-persist after
    // the wipe. End the Clerk session too when configured (no-op otherwise).
    writerRef.current.cancel();
    void clerkSignOut();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors (private mode, quota)
    }
    setState(DEFAULT_STATE);
  };

  const toggleSaved = (id: number) => {
    const target = state.history.find((item) => item.id === id);
    if (!target) return;

    const nextSaved = !target.saved;
    const nextHistory = state.history.map((entry) =>
      entry.id === id ? { ...entry, saved: nextSaved } : entry
    );

    const savedCategory = state.phrasebook.Saved ?? [];
    const nextSavedCategory = nextSaved
      ? savedCategory.includes(target.text)
        ? savedCategory
        : [...savedCategory, target.text]
      : savedCategory.filter((text) => text !== target.text);

    commit({
      ...state,
      history: nextHistory,
      phrasebook: {
        ...state.phrasebook,
        Saved: nextSavedCategory,
      },
    });
  };

  const removeHistoryEntry = (id: number) => {
    const target = state.history.find((entry) => entry.id === id);
    const nextHistory = state.history.filter((entry) => entry.id !== id);

    if (!target) {
      commit({ ...state, history: nextHistory });
      return;
    }

    // Snapshot for sync rollback (re-insert if the server rejects the delete).
    if (hasClerk) deletedSnapshots.current.set(id, target);

    const hasOtherSaved = nextHistory.some((entry) => entry.saved && entry.text === target.text);
    const nextSavedCategory = hasOtherSaved
      ? state.phrasebook.Saved ?? []
      : (state.phrasebook.Saved ?? []).filter((text) => text !== target.text);

    commit({
      ...state,
      history: nextHistory,
      phrasebook: {
        ...state.phrasebook,
        Saved: nextSavedCategory,
      },
    });
    enqueueSync({ kind: 'deleteHistory', id });
  };

  const clearHistory = () => {
    commit({
      ...state,
      history: [],
      phrasebook: {
        ...state.phrasebook,
        Saved: [],
      },
    });
  };

  const incrementReports = () => {
    commit({
      ...state,
      reportsCount: state.reportsCount + 1,
    });
  };

  const stats = useMemo(() => {
    const totalTranslations = state.history.length;
    const savedPhrases = Object.values(state.phrasebook).reduce((sum, items) => sum + items.length, 0);

    const todayStart = startOfDay(Date.now());
    const todayTranslations = state.history.filter((entry) => startOfDay(entry.timestamp) === todayStart).length;
    const activeMinutesToday = Math.max(0, todayTranslations * 2);

    const totalHoursTranslated = Number((totalTranslations * 0.03).toFixed(1));

    const confidences = state.history.filter((entry) => typeof entry.conf === 'number').map((entry) => entry.conf as number);
    const avgConfidence = confidences.length
      ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1))
      : 0;

    const activeDays = Array.from(new Set(state.history.map((entry) => startOfDay(entry.timestamp))));
    const streak = calculateStreak(activeDays);

    const latest = state.history[0];
    let lastSessionAgoLabel = 'No sessions yet';
    if (latest) {
      const mins = Math.max(1, Math.floor((Date.now() - latest.timestamp) / 60000));
      if (mins < 60) lastSessionAgoLabel = `${mins}m ago`;
      else {
        const hrs = Math.floor(mins / 60);
        lastSessionAgoLabel = `${hrs}h ago`;
      }
    }

    const weeklyCounts = Array.from({ length: 7 }, (_, idx) => {
      const day = todayStart - (6 - idx) * 86400000;
      return state.history.filter((entry) => startOfDay(entry.timestamp) === day).length;
    });

    const languageDistribution: Record<SignLanguageCode, number> = { ISL: 0, ASL: 0, BSL: 0 };
    state.history.forEach((entry) => {
      languageDistribution[entry.languageCode] += 1;
    });

    return {
      totalTranslations,
      savedPhrases,
      totalHoursTranslated,
      avgConfidence,
      currentStreakDays: streak.current,
      bestStreakDays: streak.best,
      lastSessionAgoLabel,
      activeMinutesToday,
      weeklyCounts,
      languageDistribution,
    };
  }, [state]);

  const value: AppDataContextValue = {
    state,
    isAuthenticated: state.session !== null,
    signIn,
    completeOnboarding,
    acknowledgeConsent,
    exportData,
    updateUserProfile,
    updatePreferences,
    setPrimaryLanguage,
    addHistoryEntry,
    signOut,
    toggleSaved,
    removeHistoryEntry,
    clearHistory,
    addPhrase,
    removePhrase,
    incrementReports,
    stats,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return ctx;
}

export function formatHistoryDate(ts: number) {
  const date = new Date(ts);
  const now = new Date();

  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((d1 - d0) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return dayKey(ts);
}

export function formatHistoryTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
