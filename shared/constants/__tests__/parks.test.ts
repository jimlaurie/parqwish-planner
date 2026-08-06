// ==================== PARK CONSTANTS TESTS ====================

import { PARK_NAME_TO_KEY, PARK_KEY_TO_NAME, PARK_SHORT_NAMES } from '../parks';

describe('PARK_NAME_TO_KEY', () => {
  it('maps full names to keys', () => {
    expect(PARK_NAME_TO_KEY['Disneyland']).toBe('disneyland');
    expect(PARK_NAME_TO_KEY['California Adventure']).toBe('californiaadventure');
    expect(PARK_NAME_TO_KEY['Downtown Disney']).toBe('downtown');
    expect(PARK_NAME_TO_KEY['Grand Californian']).toBe('grandcalifornian');
  });

  it('maps alternate names to same keys', () => {
    expect(PARK_NAME_TO_KEY['Disneyland Park']).toBe('disneyland');
    expect(PARK_NAME_TO_KEY['Disney California Adventure']).toBe('californiaadventure');
    expect(PARK_NAME_TO_KEY['Downtown Disney District']).toBe('downtown');
    expect(PARK_NAME_TO_KEY["Disney's Grand Californian Hotel"]).toBe('grandcalifornian');
  });

  it('returns undefined for unknown park', () => {
    expect(PARK_NAME_TO_KEY['Magic Kingdom']).toBeUndefined();
  });
});

describe('PARK_KEY_TO_NAME', () => {
  it('maps every key to a display name', () => {
    const expectedKeys = ['disneyland', 'californiaadventure', 'downtown', 'grandcalifornian', 'disneyland_hotel', 'pixar_place_hotel'];
    for (const key of expectedKeys) {
      expect(PARK_KEY_TO_NAME[key]).toBeTruthy();
    }
  });

  it('round-trips: name → key → name', () => {
    // For each display name, look up its key, then map back
    const namesToTest = ['Disneyland', 'California Adventure', 'Downtown Disney'];
    for (const name of namesToTest) {
      const key = PARK_NAME_TO_KEY[name];
      expect(key).toBeDefined();
      expect(PARK_KEY_TO_NAME[key!]).toBeTruthy();
    }
  });
});

describe('PARK_SHORT_NAMES', () => {
  it('has short names for all park keys', () => {
    for (const key of Object.keys(PARK_KEY_TO_NAME)) {
      expect(PARK_SHORT_NAMES[key]).toBeTruthy();
    }
  });

  it('short names are 2-3 characters', () => {
    for (const short of Object.values(PARK_SHORT_NAMES)) {
      expect(short.length).toBeGreaterThanOrEqual(2);
      expect(short.length).toBeLessThanOrEqual(3);
    }
  });

  it('has expected abbreviations', () => {
    expect(PARK_SHORT_NAMES['disneyland']).toBe('DL');
    expect(PARK_SHORT_NAMES['californiaadventure']).toBe('DCA');
    expect(PARK_SHORT_NAMES['downtown']).toBe('DTD');
  });
});
