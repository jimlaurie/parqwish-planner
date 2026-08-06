// ==================== TAG CONSTANTS TESTS ====================

import { WISH_TAGS, getTagById, getTagIcon } from '../tags';

describe('WISH_TAGS', () => {
  it('has 6 tags', () => {
    expect(WISH_TAGS).toHaveLength(6);
  });

  it('has unique IDs', () => {
    const ids = WISH_TAGS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every tag has id, label, and icon', () => {
    for (const tag of WISH_TAGS) {
      expect(tag.id).toBeTruthy();
      expect(tag.label).toBeTruthy();
      expect(tag.icon).toBeTruthy();
    }
  });
});

describe('getTagById', () => {
  it('returns tag for known ID', () => {
    const tag = getTagById('rides');
    expect(tag).toBeDefined();
    expect(tag!.label).toBe('Rides');
    expect(tag!.icon).toBe('🎢');
  });

  it('returns undefined for unknown ID', () => {
    expect(getTagById('nonexistent')).toBeUndefined();
  });

  it('finds all defined tag IDs', () => {
    const expectedIds = ['rides', 'shows', 'eats', 'shopping', 'place', 'other'];
    for (const id of expectedIds) {
      expect(getTagById(id)).toBeDefined();
    }
  });
});

describe('getTagIcon', () => {
  it('returns correct icon for known tag', () => {
    expect(getTagIcon('rides')).toBe('🎢');
    expect(getTagIcon('shows')).toBe('🎭');
    expect(getTagIcon('eats')).toBe('🍽️');
  });

  it('returns ⭐ fallback for unknown tag', () => {
    expect(getTagIcon('nonexistent')).toBe('⭐');
  });
});
