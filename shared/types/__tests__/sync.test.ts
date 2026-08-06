// ==================== SYNC TYPE VALIDATION TESTS ====================
// These tests validate that sync envelope structures are well-formed
// and catch shape mismatches that would cause import/export failures.

import type {
  SyncEnvelopeV2,
  SyncPayload,
  SyncRide,
  SyncShow,
  SyncDining,
  SyncWish,
  SyncPackingItem,
  SyncShoppingItem,
  SyncPhoto,
  SyncCategory,
} from '../sync';

// ==================== HELPERS ====================

function makeEmptyPayload(): SyncPayload {
  return {
    rides: [],
    shows: [],
    dining: [],
    wishes: [],
    outfits: [],
    equipment: [],
    sundries: [],
    shopping: [],
    photos: [],
    places: [],
  };
}

function makeTestEnvelope(overrides: Partial<SyncEnvelopeV2> = {}): SyncEnvelopeV2 {
  return {
    version: '2.0',
    type: 'sync',
    source: 'mobile',
    encrypted: false,
    exportDate: '2026-03-25T12:00:00.000Z',
    exportedBy: 'test-user',
    categories: ['rides', 'wishes'],
    dateRange: { startDate: '2026-04-01', endDate: '2026-04-03' },
    codeHash: 'abc123',
    data: makeEmptyPayload(),
    ...overrides,
  };
}

function makeTestRide(overrides: Partial<SyncRide> = {}): SyncRide {
  return {
    id: 'space-mountain',
    name: 'Space Mountain',
    park: 'disneyland',
    land: 'Tomorrowland',
    priority: 'E',
    completed: false,
    date: '2026-04-01',
    ...overrides,
  };
}

function makeTestWish(overrides: Partial<SyncWish> = {}): SyncWish {
  return {
    id: 'wish-1',
    title: 'Ride Space Mountain at night',
    tags: ['rides'],
    priority: 'E',
    completed: false,
    date: '2026-04-01',
    ...overrides,
  };
}

// ==================== ENVELOPE STRUCTURE ====================

describe('SyncEnvelopeV2 structure', () => {
  it('has all required fields', () => {
    const envelope = makeTestEnvelope();
    expect(envelope.version).toBe('2.0');
    expect(envelope.type).toBeDefined();
    expect(envelope.source).toBeDefined();
    expect(typeof envelope.encrypted).toBe('boolean');
    expect(envelope.exportDate).toBeTruthy();
    expect(envelope.exportedBy).toBeTruthy();
    expect(Array.isArray(envelope.categories)).toBe(true);
    expect(envelope.dateRange.startDate).toBeTruthy();
    expect(envelope.dateRange.endDate).toBeTruthy();
    expect(envelope.data).toBeDefined();
  });

  it('sync type has codeHash, archive type does not require it', () => {
    const sync = makeTestEnvelope({ type: 'sync', codeHash: 'hash123' });
    expect(sync.codeHash).toBeTruthy();

    const archive = makeTestEnvelope({ type: 'archive', codeHash: undefined });
    expect(archive.codeHash).toBeUndefined();
  });

  it('source is either mobile or pwa', () => {
    expect(['mobile', 'pwa']).toContain(makeTestEnvelope({ source: 'mobile' }).source);
    expect(['mobile', 'pwa']).toContain(makeTestEnvelope({ source: 'pwa' }).source);
  });
});

// ==================== PAYLOAD STRUCTURE ====================

describe('SyncPayload structure', () => {
  it('empty payload has all 10 arrays', () => {
    const payload = makeEmptyPayload();
    const keys = Object.keys(payload).sort();
    expect(keys).toEqual(['dining', 'equipment', 'outfits', 'photos', 'places', 'rides', 'shopping', 'shows', 'sundries', 'wishes']);
  });

  it('all payload values are arrays', () => {
    const payload = makeEmptyPayload();
    for (const value of Object.values(payload)) {
      expect(Array.isArray(value)).toBe(true);
    }
  });
});

// ==================== ITEM TYPES ====================

describe('SyncRide', () => {
  it('has required fields', () => {
    const ride = makeTestRide();
    expect(ride.id).toBeTruthy();
    expect(ride.name).toBeTruthy();
    expect(ride.park).toBeTruthy();
    expect(ride.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof ride.completed).toBe('boolean');
  });

  it('optional maxWait is a number when present', () => {
    const ride = makeTestRide({ maxWait: 45 });
    expect(typeof ride.maxWait).toBe('number');
  });
});

describe('SyncWish', () => {
  it('has required fields', () => {
    const wish = makeTestWish();
    expect(wish.id).toBeTruthy();
    expect(wish.title).toBeTruthy();
    expect(Array.isArray(wish.tags)).toBe(true);
    expect(wish.priority).toBeTruthy();
    expect(wish.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('tags are strings', () => {
    const wish = makeTestWish({ tags: ['rides', 'photos'] });
    for (const tag of wish.tags) {
      expect(typeof tag).toBe('string');
    }
  });
});

describe('SyncShoppingItem extends SyncPackingItem', () => {
  it('has packing fields plus shopping-specific fields', () => {
    const item: SyncShoppingItem = {
      id: 'shop-1',
      name: 'Mickey Ears',
      category: 'Clothing & Accessories',
      priority: 'C',
      completed: false,
      date: '2026-04-01',
      price: '$29.99',
      shops: ['emporium', 'mad-hatter'],
      url: 'https://example.com',
    };

    // PackingItem fields
    expect(item.id).toBeTruthy();
    expect(item.name).toBeTruthy();
    expect(item.category).toBeTruthy();

    // Shopping-specific fields
    expect(item.price).toBeTruthy();
    expect(Array.isArray(item.shops)).toBe(true);
    expect(item.url).toBeTruthy();
  });
});

// ==================== ROUND-TRIP SERIALIZATION ====================

describe('JSON round-trip', () => {
  it('envelope survives JSON.stringify → JSON.parse', () => {
    const envelope = makeTestEnvelope({
      data: {
        ...makeEmptyPayload(),
        rides: [makeTestRide()],
        wishes: [makeTestWish()],
      },
    });

    const json = JSON.stringify(envelope);
    const parsed = JSON.parse(json) as SyncEnvelopeV2;

    expect(parsed.version).toBe(envelope.version);
    expect(parsed.type).toBe(envelope.type);
    expect(parsed.source).toBe(envelope.source);
    expect(parsed.categories).toEqual(envelope.categories);
    expect(parsed.dateRange).toEqual(envelope.dateRange);
    expect(parsed.data.rides).toHaveLength(1);
    expect(parsed.data.wishes).toHaveLength(1);
    expect(parsed.data.rides[0].name).toBe('Space Mountain');
    expect(parsed.data.wishes[0].title).toBe('Ride Space Mountain at night');
  });

  it('payload with all item types round-trips correctly', () => {
    const payload: SyncPayload = {
      rides: [makeTestRide()],
      shows: [{ id: 's1', name: 'Fantasmic!', park: 'disneyland', land: 'Frontierland', priority: 'E', completed: false, date: '2026-04-01' }],
      dining: [{ id: 'd1', name: 'Blue Bayou', park: 'disneyland', land: 'New Orleans Square', priority: 'D', completed: false, date: '2026-04-01' }],
      wishes: [makeTestWish()],
      outfits: [{ id: 'o1', name: 'Day 1 outfit', category: 'Day Wear', priority: 'C', completed: false, date: '2026-04-01' }],
      equipment: [{ id: 'e1', name: 'Portable charger', category: 'Electronics', priority: 'D', completed: true, date: '2026-04-01' }],
      sundries: [{ id: 'su1', name: 'Sunscreen', category: 'Skincare', priority: 'E', completed: false, date: '2026-04-01' }],
      shopping: [{ id: 'sh1', name: 'Mickey Ears', category: 'Clothing & Accessories', priority: 'C', completed: false, date: '2026-04-01', shops: ['emporium'] }],
      photos: [{ id: 'p1', data: 'data:image/png;base64,abc', mimeType: 'image/png', itemId: 'o1', itemType: 'outfit' }],
      places: [{ id: 'pl1', name: 'Partners Statue', park: 'disneyland', land: 'Hub', priority: 'C', completed: false, date: '2026-04-01', latitude: 33.8125, longitude: -117.919 }],
    };

    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json) as SyncPayload;

    expect(parsed.rides).toHaveLength(1);
    expect(parsed.shows).toHaveLength(1);
    expect(parsed.dining).toHaveLength(1);
    expect(parsed.wishes).toHaveLength(1);
    expect(parsed.outfits).toHaveLength(1);
    expect(parsed.equipment).toHaveLength(1);
    expect(parsed.sundries).toHaveLength(1);
    expect(parsed.shopping).toHaveLength(1);
    expect(parsed.photos).toHaveLength(1);
    expect(parsed.places).toHaveLength(1);
  });
});

// ==================== CATEGORY COVERAGE ====================

describe('SyncCategory values', () => {
  it('all categories map to payload keys', () => {
    const payloadKeys: (keyof SyncPayload)[] = ['rides', 'shows', 'dining', 'wishes', 'outfits', 'equipment', 'sundries', 'shopping', 'photos', 'places'];
    // Every payload key should be accessible
    const payload = makeEmptyPayload();
    for (const key of payloadKeys) {
      expect(payload[key]).toBeDefined();
    }
  });
});
