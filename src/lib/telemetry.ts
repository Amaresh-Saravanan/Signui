// OPS-5 privacy kill-switch: Sentry error tracking, gated on explicit user
// consent and disabled entirely in localOnly mode. Never wired to camera
// frames, hand landmarks, or transcript text — this module only ever sees
// JS error objects and whatever plain-object `ctx` a caller passes in, and
// beforeSend scrubs that ctx defensively in case a caller passes something
// it shouldn't.
//
// Gate truth table (initTelemetry):
//   VITE_SENTRY_DSN set | consentAcknowledged | localOnly | Sentry initializes?
//   ---------------------|----------------------|-----------|--------------------
//         no             |          *           |     *     |  no (no-op)
//         yes            |        false          |     *     |  no (no-op)
//         yes            |         true          |   true    |  no (no-op)
//         yes            |         true          |   false   |  YES
//
// captureError() is always safe to call — it's a no-op until init succeeds.

import * as Sentry from '@sentry/react';

interface InitTelemetryOptions {
  dsn: string | undefined;
  consentAcknowledged: boolean;
  localOnly: boolean;
}

// Field names that must never reach Sentry, even redacted-in-place, because
// their presence alone implies detection data was captured somewhere.
const FORBIDDEN_KEY_PATTERN = /landmark|frame|image|video|transcript|text/i;

let enabled = false;

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = FORBIDDEN_KEY_PATTERN.test(key) ? '[redacted]' : scrubValue(val);
    }
    return out;
  }
  return value;
}

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      data: crumb.data ? (scrubValue(crumb.data) as Record<string, unknown>) : crumb.data,
    }));
  }
  if (event.extra) {
    event.extra = scrubValue(event.extra) as typeof event.extra;
  }
  if (event.contexts) {
    event.contexts = scrubValue(event.contexts) as typeof event.contexts;
  }
  return event;
}

/**
 * Initializes Sentry only if a DSN is configured, the user has explicitly
 * acknowledged consent, and localOnly mode is off. Otherwise this is a no-op
 * and captureError() below stays silent.
 */
export function initTelemetry({ dsn, consentAcknowledged, localOnly }: InitTelemetryOptions): void {
  if (!dsn || !consentAcknowledged || localOnly) {
    enabled = false;
    return;
  }

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.data) {
        breadcrumb.data = scrubValue(breadcrumb.data) as Record<string, unknown>;
      }
      return breadcrumb;
    },
  });
  enabled = true;
}

/**
 * Reports an error to Sentry if telemetry is enabled; otherwise does
 * nothing. `ctx` is passed as `extra` and is scrubbed by beforeSend.
 */
export function captureError(err: unknown, ctx?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
}

// ponytail: self-check only, not a test suite — run in a scratch file/console
// if you touch the gate logic: initTelemetry should stay a no-op unless all
// three conditions hold, and scrubValue must redact any key matching
// /landmark|frame|image|video|transcript|text/i at any nesting depth.
