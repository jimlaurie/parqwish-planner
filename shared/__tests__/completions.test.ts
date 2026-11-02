// A trip tick belongs to an account: shared by its Trip Users, separate for
// each collaborator, one record per app (docs/completion-design.md).

import {
  completionDocId, isValidCompletion, householdAccounts, isDoneFor, othersDone, ticksPlannerCantClear,
  householdTick, palCompletionWrites, migratedCompletions,
} from '../completions';
import type { TripCompletion } from '../types/completion';

const NOW = new Date('2026-11-10T18:00:00.000Z');
const TRIP = 'trip1';

function record(over: Partial<TripCompletion> & Pick<TripCompletion, 'itemId' | 'authorUid' | 'source'>): TripCompletion {
  const kind = over.kind ?? 'wish';
  return {
    id: completionDocId(kind, over.itemId, over.authorUid, over.source),
    tripId: TRIP, kind, completedAt: '2026-11-10T17:00:00.000Z', updatedAt: 1, ...over,
  };
}

describe('completion ids and validation', () => {
  it('builds the document id from kind, item, account and app', () => {
    expect(completionDocId('wish', 'disneyland__space', 'me', 'pal')).toBe('wish__disneyland__space__me__pal');
  });

  it('accepts a record that matches its document', () => {
    const r = record({ itemId: 'w1', authorUid: 'me', source: 'pal', dates: ['2026-11-10'] });
    expect(isValidCompletion(r, r.id, 'me')).toBe(true);
  });

  it('rejects a record that claims another account, item or document', () => {
    const r = record({ itemId: 'w1', authorUid: 'me', source: 'pal' });
    expect(isValidCompletion(r, r.id, 'smiths')).toBe(false);
    expect(isValidCompletion({ ...r, itemId: 'w2' }, r.id, 'me')).toBe(false);
    expect(isValidCompletion(r, 'wish__w1__me__planner', 'me')).toBe(false);
    expect(isValidCompletion({ ...r, authorUid: 'smiths' }, r.id, 'smiths')).toBe(false);
  });

  it('rejects malformed records', () => {
    const r = record({ itemId: 'w1', authorUid: 'me', source: 'pal' });
    expect(isValidCompletion(null, r.id, 'me')).toBe(false);
    expect(isValidCompletion({ ...r, kind: 'ride' }, r.id, 'me')).toBe(false);
    expect(isValidCompletion({ ...r, dates: ['10/11/2026'] }, r.id, 'me')).toBe(false);
    expect(isValidCompletion({ ...r, completedAt: undefined }, r.id, 'me')).toBe(false);
  });
});

describe('households', () => {
  const members: Record<string, { role: string; household?: string }> = {
    me: { role: 'owner' },
    sam: { role: 'editor', household: 'me' },  // my family, on a second phone
    smiths: { role: 'editor' },
    smithKid: { role: 'viewer', household: 'smiths' },
  };

  it('groups the accounts the Owner put in one household', () => {
    expect(householdAccounts(members, 'me').sort()).toEqual(['me', 'sam']);
    expect(householdAccounts(members, 'sam').sort()).toEqual(['me', 'sam']);
    expect(householdAccounts(members, 'smithKid').sort()).toEqual(['smithKid', 'smiths']);
  });

  it('is just the account on a trip that isn\'t shared, or for someone not on it', () => {
    expect(householdAccounts(undefined, 'local')).toEqual(['local']);
    expect(householdAccounts(members, 'stranger')).toEqual(['stranger']);
  });

  it('keeps a household together after its first account leaves the trip', () => {
    const left = Object.fromEntries(Object.entries(members).filter(([id]) => id !== 'me'));
    expect(householdAccounts(left, 'sam')).toEqual(['sam']);
    const twoLeft = { ...left, kim: { role: 'viewer', household: 'me' } };
    expect(householdAccounts(twoLeft, 'sam').sort()).toEqual(['kim', 'sam']);
  });
});

describe('who has done an item', () => {
  const mine = ['me', 'sam'];
  const all = [
    record({ itemId: 'w1', authorUid: 'me', source: 'pal' }),
    record({ itemId: 'w1', authorUid: 'smiths', source: 'planner', completedAt: '2026-11-09T10:00:00.000Z' }),
    record({ itemId: 'w1', authorUid: 'joneses', source: 'pal', completedAt: '2026-11-11T10:00:00.000Z' }),
    record({ itemId: 'w2', authorUid: 'smiths', source: 'planner' }),
    record({ itemId: 'w3', authorUid: 'sam', source: 'pal' }),
    record({ itemId: 'w1', authorUid: 'me', source: 'planner', kind: 'packing' }),
  ];

  it('is done for a household when any of its accounts has a record, for that kind only', () => {
    expect(isDoneFor(all, 'wish', 'w1', mine)).toBe(true);
    expect(isDoneFor(all, 'wish', 'w3', mine)).toBe(true);
    expect(isDoneFor(all, 'wish', 'w2', mine)).toBe(false);
    expect(isDoneFor(all, 'packing', 'w1', mine)).toBe(true);
    expect(isDoneFor(all, 'packing', 'w1', ['smiths'])).toBe(false);
  });

  it("doesn't count another household's tick as yours", () => {
    expect(isDoneFor(all, 'wish', 'w2', ['smiths'])).toBe(true);
    expect(othersDone(all, 'wish', 'w2', mine)).toEqual(['smiths']);
    expect(othersDone(all, 'wish', 'w3', ['smiths'])).toEqual(['sam']);
  });

  it('lists the other households in the order they did it', () => {
    expect(othersDone(all, 'wish', 'w1', mine)).toEqual(['smiths', 'joneses']);
  });

  it("finds the household's ticks the Planner can't clear: everything but its own Planner record", () => {
    expect(ticksPlannerCantClear(all, 'wish', 'w1', 'me', mine).map((c) => c.id)).toEqual(['wish__w1__me__pal']);
    expect(ticksPlannerCantClear(all, 'wish', 'w3', 'me', mine).map((c) => c.id)).toEqual(['wish__w3__sam__pal']);
    expect(ticksPlannerCantClear(all, 'packing', 'w1', 'me', mine)).toEqual([]);
    expect(ticksPlannerCantClear(all, 'wish', 'w2', 'me', mine)).toEqual([]);
  });

  it("gives a selection the household's tick and its earliest time", () => {
    const both = [...all, record({ itemId: 'w3', authorUid: 'me', source: 'planner', completedAt: '2026-11-08T09:00:00.000Z' })];
    expect(householdTick(both, 'wish', 'w3', mine)).toEqual({ completed: true, completedAt: '2026-11-08T09:00:00.000Z' });
    expect(householdTick(all, 'wish', 'w2', mine)).toEqual({ completed: false, completedAt: undefined });
  });
});

describe("Pal's roll-up", () => {
  it('writes a record for an item ticked on a trip date', () => {
    const { put, remove } = palCompletionWrites(TRIP, 'me', [{ kind: 'wish', itemId: 'w1', date: '2026-11-10' }], [], NOW);
    expect(put).toEqual([{
      id: 'wish__w1__me__pal', tripId: TRIP, kind: 'wish', itemId: 'w1', authorUid: 'me', source: 'pal',
      completedAt: NOW.toISOString(), dates: ['2026-11-10'], updatedAt: NOW.getTime(),
    }]);
    expect(remove).toEqual([]);
  });

  it('writes one record for ticks on several days or by several Trip Users, dates sorted and unique', () => {
    const ticks = [
      { kind: 'wish' as const, itemId: 'w1', date: '2026-11-11' },
      { kind: 'wish' as const, itemId: 'w1', date: '2026-11-10' },
      { kind: 'wish' as const, itemId: 'w1', date: '2026-11-10' },
    ];
    const { put } = palCompletionWrites(TRIP, 'me', ticks, [], NOW);
    expect(put).toHaveLength(1);
    expect(put[0].dates).toEqual(['2026-11-10', '2026-11-11']);
  });

  it("writes nothing when the record's dates are unchanged", () => {
    const prev = record({ itemId: 'w1', authorUid: 'me', source: 'pal', dates: ['2026-11-10'] });
    const { put, remove } = palCompletionWrites(TRIP, 'me', [{ kind: 'wish', itemId: 'w1', date: '2026-11-10' }], [prev], NOW);
    expect(put).toEqual([]);
    expect(remove).toEqual([]);
  });

  it('keeps the first tick time when another day is added', () => {
    const prev = record({ itemId: 'w1', authorUid: 'me', source: 'pal', dates: ['2026-11-10'] });
    const ticks = [{ kind: 'wish' as const, itemId: 'w1', date: '2026-11-10' }, { kind: 'wish' as const, itemId: 'w1', date: '2026-11-12' }];
    const { put } = palCompletionWrites(TRIP, 'me', ticks, [prev], NOW);
    expect(put[0].completedAt).toBe(prev.completedAt);
    expect(put[0].dates).toEqual(['2026-11-10', '2026-11-12']);
  });

  it('stays done while any day is still ticked, and removes the record when the last one goes', () => {
    const prev = record({ itemId: 'w1', authorUid: 'me', source: 'pal', dates: ['2026-11-10', '2026-11-11'] });
    const oneLeft = palCompletionWrites(TRIP, 'me', [{ kind: 'wish', itemId: 'w1', date: '2026-11-11' }], [prev], NOW);
    expect(oneLeft.put[0].dates).toEqual(['2026-11-11']);
    expect(oneLeft.remove).toEqual([]);
    expect(palCompletionWrites(TRIP, 'me', [], [prev], NOW).remove).toEqual([prev.id]);
  });

  it("never removes the Planner's records, another account's, or another trip's", () => {
    const existing = [
      record({ itemId: 'w1', authorUid: 'me', source: 'planner' }),
      record({ itemId: 'w1', authorUid: 'smiths', source: 'pal' }),
      { ...record({ itemId: 'w1', authorUid: 'me', source: 'pal' }), tripId: 'other' },
    ];
    expect(palCompletionWrites(TRIP, 'me', [], existing, NOW)).toEqual({ put: [], remove: [] });
  });
});

describe('carrying old shared ticks over', () => {
  const sel = (itemId: string, over: Partial<{ completed: boolean; completedAt: string }> = {}) =>
    ({ tripId: TRIP, itemId, completed: true, ...over });

  it('makes a Planner record for each ticked selection', () => {
    const out = migratedCompletions('wish', [sel('w1', { completedAt: '2026-10-01T00:00:00.000Z' }), sel('w2', { completed: false })], [], 'me', NOW);
    expect(out).toEqual([{
      id: 'wish__w1__me__planner', tripId: TRIP, kind: 'wish', itemId: 'w1', authorUid: 'me', source: 'planner',
      completedAt: '2026-10-01T00:00:00.000Z', updatedAt: NOW.getTime(),
    }]);
  });

  it('skips items this account already has a record for, whatever another household has', () => {
    const mine = [record({ itemId: 'w1', authorUid: 'me', source: 'pal' })];
    expect(migratedCompletions('wish', [sel('w1')], mine, 'me', NOW)).toEqual([]);
    const theirs = [record({ itemId: 'w1', authorUid: 'smiths', source: 'pal' })];
    expect(migratedCompletions('packing', [sel('w1')], theirs, 'me', NOW)).toHaveLength(1);
  });

  it("isn't stopped by a record for the same item on another trip", () => {
    const otherTrip = [{ ...record({ itemId: 'w1', authorUid: 'me', source: 'planner' }), tripId: 'trip_other' }];
    expect(migratedCompletions('wish', [sel('w1')], otherTrip, 'me', NOW)).toHaveLength(1);
  });
});
