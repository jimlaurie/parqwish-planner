import fs from 'fs';
import path from 'path';
import { RESORTS, DEFAULT_RESORT_ID, getResort, resortForPark, visibleResorts, resortOfParkDataId, tripResortIds, dayResortId, withDayResort } from '../resorts';
import { PARK_KEY_TO_NAME } from '../parks';

describe('resort registry', () => {
  it('has unique resort ids and globally unique park keys', () => {
    const ids = RESORTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = RESORTS.flatMap((r) => [...r.parks, ...r.areas].map((p) => p.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps every legacy Disneyland Resort key in the default resort', () => {
    const dlr = getResort(DEFAULT_RESORT_ID);
    expect(dlr?.dataPath).toBe('');
    for (const key of Object.keys(PARK_KEY_TO_NAME).filter((k) => k !== DEFAULT_RESORT_ID)) {
      expect(resortForPark(key)?.id).toBe(DEFAULT_RESORT_ID);
    }
  });

  it('uses valid IANA time zones and per-resort data paths', () => {
    for (const r of RESORTS) {
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: r.timezone })).not.toThrow();
      if (r.id !== DEFAULT_RESORT_ID) expect(r.dataPath).toBe(`resorts/${r.id}/`);
    }
  });

  it('only shows live resorts unless preview is asked for', () => {
    expect(visibleResorts().map((r) => r.id)).toEqual([DEFAULT_RESORT_ID]);
  });

  // functions/ only exists in dland-wishes; the Planner's copy of shared/ skips this.
  const functionsCopy = path.join(__dirname, '../../../functions/resorts.json');
  (fs.existsSync(functionsCopy) ? it : it.skip)('matches the copy the Cloud Functions deploy with', () => {
    const read = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(read(functionsCopy)).toEqual(read(path.join(__dirname, '../../data/resorts.json')));
  });
});

describe('trips and their days (26 Nov 2026)', () => {
  const trip = { resortIds: ['disneyland_resort', 'knotts'], dayResorts: { '2026-11-28': 'knotts', '2026-11-29': 'universal_hollywood' } };

  it('a park item belongs to its park\'s resort', () => {
    expect(resortOfParkDataId('knotts__ghostrider')?.id).toBe('knotts');
    expect(resortOfParkDataId('disneyland__space-mountain')?.id).toBe(DEFAULT_RESORT_ID);
    expect(resortOfParkDataId('nowhere__x')).toBeUndefined();
    expect(resortOfParkDataId(undefined)).toBeUndefined();
  });

  it('a trip naming no resort (every trip before multi-park) is at Disneyland Resort', () => {
    expect(tripResortIds({})).toEqual([DEFAULT_RESORT_ID]);
    expect(tripResortIds({ resortIds: ['gone'] })).toEqual([DEFAULT_RESORT_ID]);
    expect(dayResortId(null, '2026-11-28')).toBe(DEFAULT_RESORT_ID);
  });

  it('a day is at its pick while the trip visits it, else the trip\'s first resort', () => {
    expect(dayResortId(trip, '2026-11-28')).toBe('knotts');
    expect(dayResortId(trip, '2026-11-27')).toBe(DEFAULT_RESORT_ID);
    expect(dayResortId(trip, '2026-11-29')).toBe(DEFAULT_RESORT_ID); // Universal isn't on the trip
    expect(dayResortId({ resortIds: ['knotts'] }, '2026-11-27')).toBe('knotts');
  });

  it('picking the trip\'s first resort removes the date, and an empty map is no field', () => {
    expect(withDayResort(trip, '2026-11-27', 'knotts')).toEqual({ '2026-11-27': 'knotts', '2026-11-28': 'knotts', '2026-11-29': 'universal_hollywood' });
    expect(withDayResort({ resortIds: trip.resortIds, dayResorts: { '2026-11-28': 'knotts' } }, '2026-11-28', DEFAULT_RESORT_ID)).toBeUndefined();
  });
});
