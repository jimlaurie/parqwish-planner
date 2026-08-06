// ==================== SYNC CATEGORIES TESTS ====================

import { CATEGORY_META, ALL_CATEGORIES } from '../sync-categories';
import type { SyncPayload } from '../../types/sync';

describe('ALL_CATEGORIES', () => {
  it('has 12 sync categories', () => {
    expect(ALL_CATEGORIES).toHaveLength(12);
  });

  it('includes all expected categories', () => {
    const expected = ['rides', 'shows', 'dining', 'outfits', 'equipment', 'sundries', 'shopping', 'wishes', 'places', 'trail', 'scheduled_events', 'day_items'];
    for (const cat of expected) {
      expect(ALL_CATEGORIES).toContain(cat);
    }
  });
});

describe('CATEGORY_META', () => {
  it('has metadata for every category', () => {
    for (const cat of ALL_CATEGORIES) {
      const meta = CATEGORY_META[cat];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.icon).toBeTruthy();
      expect(meta.storageKey).toBeTruthy();
      expect(['array', 'object']).toContain(meta.dataType);
    }
  });

  it('payloadKey maps to valid SyncPayload keys', () => {
    const validKeys: (keyof SyncPayload)[] = ['rides', 'shows', 'dining', 'wishes', 'outfits', 'equipment', 'sundries', 'shopping', 'photos', 'places', 'trails', 'scheduledEvents', 'dayItems'];
    for (const cat of ALL_CATEGORIES) {
      expect(validKeys).toContain(CATEGORY_META[cat].payloadKey);
    }
  });

  it('storageKeys are unique per category', () => {
    const storageKeys = ALL_CATEGORIES.map((c) => CATEGORY_META[c].storageKey);
    expect(new Set(storageKeys).size).toBe(storageKeys.length);
  });
});
