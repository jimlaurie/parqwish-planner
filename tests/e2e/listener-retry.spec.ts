// listener-retry.spec.ts - a trip's live listeners start again when lost
// (src/lib/listener-retry.ts). Found 28 Nov 2026: Pal's bookings reached
// Firestore but an open Preview didn't show them until it was reloaded, as
// the listeners for a trip made in this browser were refused before the
// server had the trip, and Firestore doesn't start a refused one again.
// No browser needed: a fake listener and a hand-run clock.

import { test, expect } from "@playwright/test";
import { keepListening, listenerRetryDelay, type StartListener } from "../../src/lib/listener-retry";

/** A clock whose timers run only when told to. */
function fakeClock() {
  let time = 0;
  const timers: { at: number; fn: () => void }[] = [];
  return {
    now: () => time,
    schedule: (fn: () => void, ms: number) => { const t = { at: time + ms, fn }; timers.push(t); return t; },
    cancel: (h: unknown) => { const i = timers.indexOf(h as never); if (i >= 0) timers.splice(i, 1); },
    /** Moves time on, running the timers due. */
    advance(ms: number) {
      time += ms;
      for (const t of timers.filter((x) => x.at <= time)) { timers.splice(timers.indexOf(t), 1); t.fn(); }
    },
    pending: () => timers.length,
  };
}

/** A listener that records each start and stop, and lets the test report it lost. */
function fakeListener() {
  const runs: { lost: (why: unknown) => void; stopped: boolean }[] = [];
  const start: StartListener = (lost) => {
    const run = { lost, stopped: false };
    runs.push(run);
    return () => { run.stopped = true; };
  };
  return { start, runs, live: () => runs.filter((r) => !r.stopped).length };
}

const quiet = { log: () => {} };

test.describe("trip listeners start again when lost", () => {
  test("a refused listener starts again after a second, and only one runs", () => {
    const clock = fakeClock();
    const l = fakeListener();
    keepListening("dayItems", l.start, { ...clock, ...quiet });
    expect(l.runs).toHaveLength(1);

    l.runs[0].lost({ code: "permission-denied" });
    expect(l.runs[0].stopped).toBe(true);
    expect(l.live()).toBe(0);
    clock.advance(999);
    expect(l.runs).toHaveLength(1);
    clock.advance(1);
    expect(l.runs).toHaveLength(2);
    expect(l.live()).toBe(1);
  });

  test("an old listener reporting again, or twice, starts only one new one", () => {
    const clock = fakeClock();
    const l = fakeListener();
    keepListening("dayItems", l.start, { ...clock, ...quiet });
    l.runs[0].lost("first");
    l.runs[0].lost("again");
    expect(clock.pending()).toBe(1);
    clock.advance(1000);
    l.runs[0].lost("late, from the old one");
    expect(clock.pending()).toBe(0);
    expect(l.live()).toBe(1);
  });

  test("waits longer each time in a row, starting over after a healthy run", () => {
    expect([0, 1, 2, 3, 6, 7, 20].map(listenerRetryDelay)).toEqual([1000, 2000, 4000, 8000, 60000, 60000, 60000]);
    const clock = fakeClock();
    const l = fakeListener();
    const waits: number[] = [];
    keepListening("dayItems", l.start, { ...clock, ...quiet, delay: (a) => { waits.push(a); return 1000; } });
    l.runs[0].lost("x"); clock.advance(1000);
    l.runs[1].lost("x"); clock.advance(1000);
    clock.advance(200_000); // ran well
    l.runs[2].lost("x"); clock.advance(1000);
    expect(waits).toEqual([0, 1, 0]);
  });

  test("gives up after the most restarts in a row", () => {
    const clock = fakeClock();
    const l = fakeListener();
    const logs: string[] = [];
    keepListening("dayItems", l.start, { ...clock, log: (m) => logs.push(m), maxAttempts: 2, delay: () => 10 });
    for (let i = 0; i < 3; i++) { l.runs[i].lost({ code: "permission-denied" }); clock.advance(10); }
    expect(l.runs).toHaveLength(3);
    expect(logs.at(-1)).toContain("gave up after 2 restarts");
  });

  test("stopping ends the listener and any restart waiting", () => {
    const clock = fakeClock();
    const l = fakeListener();
    const stop = keepListening("dayItems", l.start, { ...clock, ...quiet });
    l.runs[0].lost("x");
    stop();
    clock.advance(5000);
    expect(l.runs).toHaveLength(1);

    const l2 = fakeListener();
    const stop2 = keepListening("dayItems", l2.start, { ...clock, ...quiet });
    stop2();
    expect(l2.runs[0].stopped).toBe(true);
  });

  test("a loss reported while starting ends that listener once it's returned", () => {
    const clock = fakeClock();
    let stops = 0;
    let starts = 0;
    keepListening("dayItems", (lost) => { starts++; if (starts === 1) lost("at once"); return () => { stops++; }; }, { ...clock, ...quiet });
    expect(stops).toBe(1);
    clock.advance(1000);
    expect(starts).toBe(2);
    expect(stops).toBe(1);
  });
});
