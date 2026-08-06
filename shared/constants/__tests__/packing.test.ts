// ==================== PACKING CONSTANTS TESTS ====================

import { PACKING_TABS, PACKING_CATEGORIES, getPackingTab } from '../packing';
import type { PackingType } from '../../types/packing';

describe('PACKING_TABS', () => {
  it('has 5 tabs', () => {
    expect(PACKING_TABS).toHaveLength(5);
  });

  it('has expected tab types in order', () => {
    const ids = PACKING_TABS.map((t) => t.id);
    expect(ids).toEqual(['outfit', 'equipment', 'sundry', 'shopping', 'dining']);
  });

  it('every tab has unique id, label, icon, and idPrefix', () => {
    const ids = new Set<string>();
    const prefixes = new Set<string>();
    for (const tab of PACKING_TABS) {
      expect(tab.id).toBeTruthy();
      expect(tab.label).toBeTruthy();
      expect(tab.icon).toBeTruthy();
      expect(tab.idPrefix).toBeTruthy();
      expect(ids.has(tab.id)).toBe(false);
      expect(prefixes.has(tab.idPrefix)).toBe(false);
      ids.add(tab.id);
      prefixes.add(tab.idPrefix);
    }
  });
});

describe('PACKING_CATEGORIES', () => {
  it('has categories for every tab type', () => {
    for (const tab of PACKING_TABS) {
      expect(PACKING_CATEGORIES[tab.id]).toBeDefined();
      expect(PACKING_CATEGORIES[tab.id].length).toBeGreaterThan(0);
    }
  });

  it('every category list ends with "Other"', () => {
    for (const [type, categories] of Object.entries(PACKING_CATEGORIES)) {
      expect(categories[categories.length - 1]).toBe('Other');
    }
  });

  it('outfit categories include expected items', () => {
    const outfitCats = PACKING_CATEGORIES['outfit'];
    expect(outfitCats).toContain('Day Wear');
    expect(outfitCats).toContain('Shoes');
    expect(outfitCats).toContain('Accessories');
  });

  it('dining categories include expected meal types', () => {
    const diningCats = PACKING_CATEGORIES['dining'];
    expect(diningCats).toContain('Breakfast');
    expect(diningCats).toContain('Lunch');
    expect(diningCats).toContain('Dinner');
    expect(diningCats).toContain('Character Dining');
  });
});

describe('getPackingTab', () => {
  it('returns tab config for known type', () => {
    const tab = getPackingTab('outfit');
    expect(tab).toBeDefined();
    expect(tab!.label).toBe('Outfits');
  });

  it('returns undefined for unknown type', () => {
    expect(getPackingTab('nonexistent' as PackingType)).toBeUndefined();
  });
});
