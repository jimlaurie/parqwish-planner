// ==================== LISTENER RETRY ====================
// Keeps one of a trip's live Firestore listeners running (28 Nov 2026).
//
// Found when bookings made in Pal reached Firestore but didn't show on an
// open Planner page's Preview until it was reloaded. A trip's content
// (selections, day items, mirrors, trails, photos, ticks) may only be read
// once the trip is on the server (firestore.rules, canReadContent), and the
// Planner starts a trip's listeners as soon as it sees the trip, which for a
// trip just made in this browser is before the server has it. Firestore
// ends a refused listener for good, and the server's copy then arrives as a
// change to a trip that already had listeners, so none started again.
// A snapshot that came before the trip's key could be read, or that threw,
// also lost its changes, which Firestore never sends again.
//
// The listener reports these through `lost`, and this starts it again after
// a short wait. A new listener's first snapshot holds the whole collection,
// so anything missed arrives then (unchanged items are skipped as usual).
// No Firestore here, so tests/e2e/listener-retry.spec.ts can drive it.

export type Unsubscribe = () => void;

/** Starts the listener; it calls `lost` when it can't go on (error, no key yet, a snapshot that failed). */
export type StartListener = (lost: (why: unknown) => void) => Unsubscribe;

export interface RetryOptions {
  /** Restarts in a row before giving up. */
  maxAttempts?: number;
  /** Running this long counts as working: the next loss starts the count again. */
  healthyMs?: number;
  /** Called with the restart number (0 first); defaults to listenerRetryDelay. */
  delay?: (attempt: number) => number;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
  /** Says what happened (console by default). */
  log?: (message: string) => void;
}

/** 1 s, 2 s, 4 s … up to a minute. */
export function listenerRetryDelay(attempt: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempt));
}

function describe(why: unknown): string {
  if (why && typeof why === "object" && "code" in why) return String((why as { code: unknown }).code);
  if (why instanceof Error) return why.message;
  return String(why);
}

/**
 * Runs `start`, and starts it again whenever it reports itself lost, until
 * the returned function stops it. Gives up after `maxAttempts` restarts in a
 * row (a trip this account was removed from is refused every time).
 */
export function keepListening(label: string, start: StartListener, options: RetryOptions = {}): Unsubscribe {
  const {
    maxAttempts = 10, healthyMs = 120_000, delay = listenerRetryDelay,
    now = Date.now, schedule = setTimeout, cancel = (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    log = (m) => console.warn(m),
  } = options;
  let current: Unsubscribe | null = null;
  let timer: unknown = null;
  let stopped = false;
  let attempt = 0;
  let startedAt = 0;
  let generation = 0;

  const run = () => {
    timer = null;
    if (stopped) return;
    const mine = ++generation;
    startedAt = now();
    let returned = false;
    let endWhenReturned = false;
    const unsub = start((why) => {
      // Only the listener now running, and only once
      if (stopped || mine !== generation || timer !== null) return;
      // Reported before start() returned: end it as soon as it does
      if (!returned) endWhenReturned = true;
      else { current = null; try { unsub(); } catch { /* already ended */ } }
      if (now() - startedAt >= healthyMs) attempt = 0;
      if (attempt >= maxAttempts) {
        log(`[wish-sync] ${label} listener lost (${describe(why)}); gave up after ${maxAttempts} restarts`);
        return;
      }
      const wait = delay(attempt++);
      log(`[wish-sync] ${label} listener lost (${describe(why)}); starting again in ${Math.round(wait / 1000)}s`);
      timer = schedule(run, wait);
    });
    returned = true;
    if (endWhenReturned) unsub();
    else current = unsub;
  };

  run();
  return () => {
    stopped = true;
    if (timer !== null) cancel(timer);
    timer = null;
    current?.();
    current = null;
  };
}
