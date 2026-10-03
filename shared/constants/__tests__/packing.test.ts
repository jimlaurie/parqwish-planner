// ==================== PACKING CONSTANTS TESTS ====================

import { PACKING_TABS, PACKING_CATEGORIES, getPackingTab, normalizePackingCategory } from '../packing';
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

describe('normalizePackingCategory', () => {
  it('keeps Accessories and Ears & Headwear as separate shopping sub-categories', () => {
    expect(PACKING_CATEGORIES.shopping).toContain('Accessories');
    expect(PACKING_CATEGORIES.shopping).toContain('Ears & Headwear');
    expect(PACKING_CATEGORIES.shopping).toContain('Clothing');
  });

  it('translates the old Planner and Pal names', () => {
    expect(normalizePackingCategory('shopping', 'Apparel')).toBe('Clothing');
    expect(normalizePackingCategory('shopping', 'Clothing & Accessories')).toBe('Clothing');
    expect(normalizePackingCategory('shopping', 'Home Decor')).toBe('Home & Decor');
    expect(normalizePackingCategory('outfit', 'Dapper Day')).toBe('Themed');
    expect(normalizePackingCategory('equipment', 'Tech')).toBe('Electronics');
    expect(normalizePackingCategory('sundry', 'Food')).toBe('Snacks');
    expect(normalizePackingCategory('sundry', 'Custom')).toBe('Other');
  });

  it('only translates names within their own type', () => {
    expect(normalizePackingCategory('outfit', 'Accessories')).toBe('Accessories');
    expect(normalizePackingCategory('shopping', 'Accessories')).toBe('Accessories');
    expect(normalizePackingCategory('equipment', 'Accessories')).toBe('Comfort');
  });

  it('defaults blank to Other and keeps unknown names', () => {
    expect(normalizePackingCategory('shopping', undefined)).toBe('Other');
    expect(normalizePackingCategory('shopping', '  ')).toBe('Other');
    expect(normalizePackingCategory('shopping', 'Holiday')).toBe('Holiday');
  });

  it('every current name maps to itself', () => {
    for (const [type, categories] of Object.entries(PACKING_CATEGORIES)) {
      for (const cat of categories) {
        expect(normalizePackingCategory(type as keyof typeof PACKING_CATEGORIES, cat)).toBe(cat);
      }
    }
  });
});
