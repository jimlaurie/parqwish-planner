// A trip tick belongs to an account: shared by its Trip Users, separate for
// each collaborator, one record per app (docs/completion-design.md).

import {
  completionDocId, isValidCompletion, isDoneFor, othersDone, palOnlyCompletion,
  palCompletionWrites, migratedCompletions,
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

describe('who has done an item', () => {
  const all = [
    record({ itemId: 'w1', authorUid: 'me', source: 'pal' }),
    record({ itemId: 'w1', authorUid: 'smiths', source: 'planner', completedAt: '2026-11-09T10:00:00.000Z' }),
    record({ itemId: 'w1', authorUid: 'joneses', source: 'pal', completedAt: '2026-11-11T10:00:00.000Z' }),
    record({ itemId: 'w2', authorUid: 'smiths', source: 'planner' }),
    record({ itemId: 'w1', authorUid: 'me', source: 'planner', kind: 'packing' }),
  ];

  it('is done for an account with a record from either app, for that kind only', () => {
    expect(isDoneFor(all, 'wish', 'w1', 'me')).toBe(true);
    expect(isDoneFor(all, 'wish', 'w2', 'me')).toBe(false);
    expect(isDoneFor(all, 'packing', 'w1', 'me')).toBe(true);
    expect(isDoneFor(all, 'packing', 'w1', 'smiths')).toBe(false);
  });

  it("doesn't count another household's tick as yours", () => {
    expect(isDoneFor(all, 'wish', 'w2', 'smiths')).toBe(true);
    expect(othersDone(all, 'wish', 'w2', 'me')).toEqual(['smiths']);
  });

  it('lists the other households in the order they did it', () => {
    expect(othersDone(all, 'wish', 'w1', 'me')).toEqual(['smiths', 'joneses']);
  });

  it("finds a Pal-only tick, which the Planner can't untick", () => {
    expect(palOnlyCompletion(all, 'wish', 'w1', 'me')?.source).toBe('pal');
    const both = [...all, record({ itemId: 'w1', authorUid: 'me', source: 'planner' })];
    expect(palOnlyCompletion(both, 'wish', 'w1', 'me')).toBeUndefined();
    expect(palOnlyCompletion(all, 'wish', 'w2', 'smiths')).toBeUndefined();
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
  const sel = (itemId: string, over: Partial<{ completed: boolean; authorUid: string; completedAt: string }> = {}) =>
    ({ tripId: TRIP, itemId, completed: true, authorUid: 'me', ...over });

  it('makes a Planner record for each tick this account made', () => {
    const out = migratedCompletions('wish', [sel('w1', { completedAt: '2026-10-01T00:00:00.000Z' }), sel('w2', { completed: false })], [], 'me', true, NOW);
    expect(out).toEqual([{
      id: 'wish__w1__me__planner', tripId: TRIP, kind: 'wish', itemId: 'w1', authorUid: 'me', source: 'planner',
      completedAt: '2026-10-01T00:00:00.000Z', updatedAt: NOW.getTime(),
    }]);
  });

  it("leaves another household's tick for them to carry over", () => {
    expect(migratedCompletions('wish', [sel('w1', { authorUid: 'smiths' })], [], 'me', true, NOW)).toEqual([]);
  });

  it('takes an unstamped tick only on a trip that isn\'t shared', () => {
    const unstamped = { tripId: TRIP, itemId: 'w1', completed: true };
    expect(migratedCompletions('packing', [unstamped], [], 'me', false, NOW)).toHaveLength(1);
    expect(migratedCompletions('packing', [unstamped], [], 'me', true, NOW)).toEqual([]);
  });

  it('skips items this account already has a record for, whatever another household has', () => {
    const mine = [record({ itemId: 'w1', authorUid: 'me', source: 'pal' })];
    expect(migratedCompletions('wish', [sel('w1')], mine, 'me', true, NOW)).toEqual([]);
    const theirs = [record({ itemId: 'w1', authorUid: 'smiths', source: 'pal' })];
    expect(migratedCompletions('wish', [sel('w1')], theirs, 'me', true, NOW)).toHaveLength(1);
  });
});
