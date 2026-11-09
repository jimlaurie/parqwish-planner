import {
  collectionItemDate,
  collectionItemSummary,
  collectionStateCounts,
  collectionTabs,
  emptyCollectionTabText,
  formatCollectionDate,
  pickCollectionCategory,
  pickCollectionTab,
  visibleCollectionItems,
} from '../collection-view';
import type { CollectionFieldDef, CollectionItem } from '../types/collection';

const T = 1_700_000_000_000;

function item(id: string, extra: Partial<CollectionItem> = {}): CollectionItem {
  return { id, name: id, category: 'pins', state: 'have', createdAt: T, updatedAt: T, ...extra };
}

describe('picking the category and tab', () => {
  it('counts each state of one category', () => {
    const items = [item('a'), item('b', { state: 'want' }), item('c', { state: 'want' }), item('d', { category: 'plush' }), item('e', { state: 'gone' })];
    expect(collectionStateCounts(items, 'pins')).toEqual({ have: 1, want: 2, trade: 0, gone: 1 });
  });

  it('shows Trade where the category trades or holds traders, and Gone only with history', () => {
    const none = { have: 0, want: 0, trade: 0, gone: 0 };
    expect(collectionTabs(false, none)).toEqual(['have', 'want']);
    expect(collectionTabs(true, none)).toEqual(['have', 'want', 'trade']);
    expect(collectionTabs(false, { ...none, trade: 1 })).toEqual(['have', 'want', 'trade']);
    expect(collectionTabs(false, { ...none, gone: 2 })).toEqual(['have', 'want', 'gone']);
  });

  it('keeps the previous category and tab while they still apply', () => {
    expect(pickCollectionCategory(['pins', 'plush'], 'plush')).toBe('plush');
    expect(pickCollectionCategory(['pins', 'plush'], 'ears')).toBe('pins');
    expect(pickCollectionCategory([], 'ears')).toBeUndefined();
    expect(pickCollectionTab(['have', 'want', 'trade'], 'trade')).toBe('trade');
    expect(pickCollectionTab(['have', 'want'], 'trade')).toBe('have');
    expect(pickCollectionTab(['have', 'want'], undefined)).toBe('have');
  });
});

describe('the items in a tab', () => {
  it('puts wants in ticket order, E-ticket grails first and unticketed last', () => {
    const items = [item('zed', { state: 'want', priority: 'A' }), item('none', { state: 'want' }),
      item('grail', { state: 'want', priority: 'E' }), item('alpha', { state: 'want', priority: 'A' }), item('mid', { state: 'want', priority: 'C' })];
    expect(visibleCollectionItems(items, 'pins', 'want').map((i) => i.id)).toEqual(['grail', 'mid', 'alpha', 'zed', 'none']);
  });

  it('puts the rest newest first, by date then when added', () => {
    const items = [
      item('old', { acquired: { date: '2025-05-01' } }),
      item('new', { acquired: { date: '2026-11-01' } }),
      item('undated-late', { createdAt: T + 10 }),
      item('undated-early'),
      item('other', { category: 'plush' }),
    ];
    expect(visibleCollectionItems(items, 'pins', 'have').map((i) => i.id)).toEqual(['new', 'old', 'undated-late', 'undated-early']);
    const gone = [item('a', { state: 'gone', gone: { date: '2026-01-01' } }), item('b', { state: 'gone', gone: { date: '2026-06-01' } })];
    expect(visibleCollectionItems(gone, 'pins', 'gone').map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('doesn\'t reorder the list it was given', () => {
    const items = [item('b', { acquired: { date: '2020-01-01' } }), item('a', { acquired: { date: '2026-01-01' } })];
    visibleCollectionItems(items, 'pins', 'have');
    expect(items.map((i) => i.id)).toEqual(['b', 'a']);
  });
});

describe('the text on a tile', () => {
  const fields: CollectionFieldDef[] = [
    { id: 'edition', name: 'Edition', type: 'choice', choices: ['Open Edition', 'Limited Edition'] },
    { id: 'limited', name: 'Limited release', type: 'boolean' },
    { id: 'size', name: 'Size', type: 'number', unit: 'cm' },
    { id: 'year', name: 'Year', type: 'number' },
  ];

  it('shows the first filled-in fields in form order', () => {
    expect(collectionItemSummary(item('a', { details: { year: 2024, edition: 'Limited Edition', size: 30 } }), fields))
      .toBe('Limited Edition · 30 cm');
    expect(collectionItemSummary(item('a', { details: { limited: true, year: 2024 } }), fields)).toBe('Limited release · 2024');
    expect(collectionItemSummary(item('a', { details: { limited: false, edition: '' } }), fields)).toBe('');
    expect(collectionItemSummary(item('a'), fields)).toBe('');
    expect(collectionItemSummary(item('a', { details: { edition: 'Open Edition', year: 2020 } }), fields, 1)).toBe('Open Edition');
  });

  it('formats dates as calendar dates, whatever the time zone', () => {
    expect(formatCollectionDate('2026-11-09')).toBe('Nov 9, 2026');
    expect(formatCollectionDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatCollectionDate('2026-02-30')).toBe('');
    expect(formatCollectionDate('Nov 9')).toBe('');
    expect(formatCollectionDate(undefined)).toBe('');
  });

  it('dates a list row by when it arrived, or left for gone items', () => {
    expect(collectionItemDate(item('a', { acquired: { date: '2026-03-02' } }))).toBe('Mar 2, 2026');
    expect(collectionItemDate(item('a', { state: 'gone', acquired: { date: '2026-03-02' }, gone: { date: '2026-04-05' } }))).toBe('Apr 5, 2026');
  });

  it('says what an empty tab means', () => {
    expect(emptyCollectionTabText('have', 'Pins')).toBe('No pins in your collection yet.');
    expect(emptyCollectionTabText('want', 'Pins')).toMatch(/want list/);
    expect(emptyCollectionTabText('trade', 'Pins')).toMatch(/trade/);
  });
});
