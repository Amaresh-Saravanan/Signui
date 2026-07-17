/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk publishable key (browser-safe). Absent → app runs local-first. */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  /** Sentry DSN. Absent → telemetry is a no-op (OPS-5). */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
