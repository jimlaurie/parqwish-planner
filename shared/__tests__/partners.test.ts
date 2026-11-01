// Partner branding shows only within its dates (docs/partner-branding-design.md).

import { brandingShowing, PARTNER_ID } from '../partners';

const branding = { id: 'sample-hotel', name: 'Sample Hotel', startsAt: '2026-12-01', endsAt: '2027-05-31' };

describe('partner branding dates', () => {
  it('shows from its first day to its last day, inclusive', () => {
    expect(brandingShowing(branding, '2026-12-01')).toBe(true);
    expect(brandingShowing(branding, '2027-03-15')).toBe(true);
    expect(brandingShowing(branding, '2027-05-31')).toBe(true);
  });

  it('is hidden before it starts and from the day after it ends', () => {
    expect(brandingShowing(branding, '2026-11-30')).toBe(false);
    expect(brandingShowing(branding, '2027-06-01')).toBe(false);
  });

  it('is hidden when the file is missing or malformed', () => {
    expect(brandingShowing(null, '2027-01-01')).toBe(false);
    expect(brandingShowing({ ...branding, endsAt: undefined }, '2027-01-01')).toBe(false);
    expect(brandingShowing({ ...branding, endsAt: '31/05/2027' }, '2027-01-01')).toBe(false);
    expect(brandingShowing({ ...branding, id: '../x' }, '2027-01-01')).toBe(false);
    expect(brandingShowing({ ...branding, name: '' }, '2027-01-01')).toBe(false);
  });
});

describe('partner ids', () => {
  it('are short URL slugs', () => {
    expect(PARTNER_ID.test('sample-hotel')).toBe(true);
    expect(PARTNER_ID.test('Sample')).toBe(false);
    expect(PARTNER_ID.test('a')).toBe(false);
    expect(PARTNER_ID.test('x/y')).toBe(false);
  });
});
