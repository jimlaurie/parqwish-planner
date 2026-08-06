// ==================== PRIORITY CONSTANTS TESTS ====================

import {
  TICKET_PRIORITIES,
  TICKET_COLORS,
  PRIORITY_SORT_ORDER,
  PRIORITY_ALIASES,
} from '../priorities';

describe('TICKET_PRIORITIES', () => {
  it('has 5 priority levels A through E', () => {
    expect(TICKET_PRIORITIES).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});

describe('TICKET_COLORS', () => {
  it('has config for every priority level', () => {
    for (const p of TICKET_PRIORITIES) {
      const config = TICKET_COLORS[p];
      expect(config).toBeDefined();
      expect(config.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(config.border).toMatch(/^#[0-9a-f]{6}$/i);
      expect(config.label).toBeTruthy();
    }
  });

  it('E is "Must Do" (highest priority)', () => {
    expect(TICKET_COLORS['E'].label).toBe('Must Do');
  });

  it('A is "If Time" (lowest priority)', () => {
    expect(TICKET_COLORS['A'].label).toBe('If Time');
  });
});

describe('PRIORITY_SORT_ORDER', () => {
  it('E sorts first (0), A sorts last (4)', () => {
    expect(PRIORITY_SORT_ORDER['E']).toBe(0);
    expect(PRIORITY_SORT_ORDER['A']).toBe(4);
  });

  it('is monotonically increasing from E to A', () => {
    const order = ['E', 'D', 'C', 'B', 'A'].map((p) => PRIORITY_SORT_ORDER[p]);
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1]);
    }
  });
});

describe('PRIORITY_ALIASES', () => {
  it('maps HIGH to E', () => {
    expect(PRIORITY_ALIASES.HIGH).toBe('E');
  });

  it('maps MEDIUM to C', () => {
    expect(PRIORITY_ALIASES.MEDIUM).toBe('C');
  });

  it('maps LOW to A', () => {
    expect(PRIORITY_ALIASES.LOW).toBe('A');
  });
});
