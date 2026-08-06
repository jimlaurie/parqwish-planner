// ==================== SHARED TYPE STRUCTURAL TESTS ====================
// Compile-time type checks combined with runtime structural validation
// to ensure type definitions stay correct across mobile and PWA.

import type { Priority, ParkKey, Timestamped } from '../types/common';
import type {
  Wish,
  PhotoSet,
  TripWishSelection,
  WishStatus,
  WishSourceType,
} from '../types/wish';
import type {
  Trip,
  TripPhase,
  UserProfile,
} from '../types/trip';
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
} from '../types/sync';

// ==================== HELPERS ====================

function makeWish(overrides: Partial<Wish> = {}): Wish {
  return {
    id: 'wish-001',
    title: 'Ride Space Mountain',
    tags: ['rides'],
    priority: 'E',
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-spring-2026',
    name: 'Spring Break 2026',
    startDate: '2026-04-01',
    endDate: '2026-04-05',
    isTemplate: false,
    phase: 'plan',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

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

function makeEnvelope(overrides: Partial<SyncEnvelopeV2> = {}): SyncEnvelopeV2 {
  return {
    version: '2.0',
    type: 'sync',
    source: 'mobile',
    encrypted: false,
    exportDate: '2026-03-25T10:00:00.000Z',
    exportedBy: 'test-user',
    categories: ['rides', 'wishes'],
    dateRange: { startDate: '2026-04-01', endDate: '2026-04-05' },
    data: makeEmptyPayload(),
    ...overrides,
  };
}

// ==================== WISH TYPE ====================

describe('Wish type', () => {
  it('can create a valid Wish with required fields', () => {
    const wish = makeWish();
    expect(wish.id).toBe('wish-001');
    expect(wish.title).toBe('Ride Space Mountain');
    expect(Array.isArray(wish.tags)).toBe(true);
    expect(wish.priority).toBe('E');
    expect(typeof wish.createdAt).toBe('number');
  });

  it('supports all optional fields', () => {
    const photoSet: PhotoSet = {
      thumbnail: 'thumb.jpg',
      display: 'display.jpg',
      full: 'full.jpg',
    };

    const wish = makeWish({
      description: 'Night ride is the best',
      notes: 'Single rider line available',
      url: 'https://disneyland.disney.go.com/attractions/space-mountain/',
      photos: ['photo1.jpg', 'photo2.jpg'],
      photoSets: [photoSet],
      parkDataId: 'space-mountain',
      park: 'disneyland',
      land: 'Tomorrowland',
      maxWaitTime: 60,
      sourceType: 'app' as WishSourceType,
      updatedAt: Date.now(),
    });

    expect(wish.description).toBe('Night ride is the best');
    expect(wish.notes).toBe('Single rider line available');
    expect(wish.url).toContain('space-mountain');
    expect(wish.photos).toHaveLength(2);
    expect(wish.photoSets).toHaveLength(1);
    expect(wish.photoSets![0].thumbnail).toBe('thumb.jpg');
    expect(wish.photoSets![0].display).toBe('display.jpg');
    expect(wish.photoSets![0].full).toBe('full.jpg');
    expect(wish.parkDataId).toBe('space-mountain');
    expect(wish.park).toBe('disneyland');
    expect(wish.land).toBe('Tomorrowland');
    expect(wish.maxWaitTime).toBe(60);
    expect(wish.sourceType).toBe('app');
    expect(typeof wish.updatedAt).toBe('number');
  });

  it('optional fields default to undefined when omitted', () => {
    const wish = makeWish();
    expect(wish.description).toBeUndefined();
    expect(wish.notes).toBeUndefined();
    expect(wish.url).toBeUndefined();
    expect(wish.photos).toBeUndefined();
    expect(wish.photoSets).toBeUndefined();
    expect(wish.parkDataId).toBeUndefined();
    expect(wish.park).toBeUndefined();
    expect(wish.land).toBeUndefined();
    expect(wish.maxWaitTime).toBeUndefined();
    expect(wish.sourceType).toBeUndefined();
    expect(wish.updatedAt).toBeUndefined();
  });
});

describe('TripWishSelection type', () => {
  it('has id, tripId, wishId, completed, status, addedAt', () => {
    const selection: TripWishSelection = {
      id: 'trip-spring-2026__wish-001',
      tripId: 'trip-spring-2026',
      wishId: 'wish-001',
      completed: false,
      status: 'planned',
      addedAt: Date.now(),
    };

    expect(selection.id).toBe('trip-spring-2026__wish-001');
    expect(selection.tripId).toBe('trip-spring-2026');
    expect(selection.wishId).toBe('wish-001');
    expect(selection.completed).toBe(false);
    expect(selection.status).toBe('planned');
    expect(typeof selection.addedAt).toBe('number');
  });

  it('status accepts all WishStatus values', () => {
    const statuses: WishStatus[] = ['idea', 'planned', 'assigned-to-day', 'completed', 'skipped'];
    for (const status of statuses) {
      const selection: TripWishSelection = {
        id: 'trip__wish',
        tripId: 'trip',
        wishId: 'wish',
        completed: status === 'completed',
        status,
        addedAt: Date.now(),
      };
      expect(selection.status).toBe(status);
    }
  });
});

// ==================== TRIP TYPE ====================

describe('Trip type', () => {
  it('can create a valid Trip with required fields', () => {
    const trip = makeTrip();
    expect(trip.id).toBe('trip-spring-2026');
    expect(trip.name).toBe('Spring Break 2026');
    expect(trip.startDate).toBe('2026-04-01');
    expect(trip.endDate).toBe('2026-04-05');
    expect(trip.isTemplate).toBe(false);
    expect(trip.phase).toBe('plan');
    expect(typeof trip.createdAt).toBe('number');
    expect(typeof trip.updatedAt).toBe('number');
  });

  it('extends Timestamped with createdAt and updatedAt', () => {
    const trip = makeTrip();
    // Trip extends Timestamped, so both fields are required
    const timestamped: Timestamped = { createdAt: trip.createdAt, updatedAt: trip.updatedAt };
    expect(typeof timestamped.createdAt).toBe('number');
    expect(typeof timestamped.updatedAt).toBe('number');
  });

  it('TripPhase is one of plan, prepare, play, publish', () => {
    const phases: TripPhase[] = ['plan', 'prepare', 'play', 'publish'];
    for (const phase of phases) {
      const trip = makeTrip({ phase });
      expect(trip.phase).toBe(phase);
    }
    expect(['plan', 'prepare', 'play', 'publish']).toHaveLength(4);
  });

  it('template trip has empty startDate and endDate', () => {
    const template = makeTrip({
      isTemplate: true,
      startDate: '',
      endDate: '',
      name: 'Family Template',
    });
    expect(template.isTemplate).toBe(true);
    expect(template.startDate).toBe('');
    expect(template.endDate).toBe('');
  });

  it('supports optional travel fields', () => {
    const trip = makeTrip({
      flightArrival: '2026-04-01T08:30',
      flightDeparture: '2026-04-05T18:00',
      flightConfirmation: 'ABC123',
      flightNotes: 'Window seat',
      hotelName: "Disney's Grand Californian",
      hotelConfirmation: 'GC-456',
      hotelCheckIn: '2026-04-01',
      hotelCheckOut: '2026-04-05',
      hotelNotes: 'Theme park view',
      transportationType: 'Rental car',
      transportationDetails: 'Hertz compact',
      transportationNotes: 'Pick up at LAX',
      notes: 'Birthday trip',
      isArchived: false,
      archiveFileName: undefined,
    });

    expect(trip.flightArrival).toBe('2026-04-01T08:30');
    expect(trip.hotelName).toBe("Disney's Grand Californian");
    expect(trip.transportationType).toBe('Rental car');
    expect(trip.notes).toBe('Birthday trip');
    expect(trip.isArchived).toBe(false);
  });
});

describe('UserProfile type', () => {
  it('has id, username, and required createdAt', () => {
    const user: UserProfile = {
      id: 'user_primary',
      username: 'DisneyFan',
      createdAt: Date.now(),
    };
    expect(user.id).toBe('user_primary');
    expect(user.username).toBe('DisneyFan');
    expect(user.createdAt).toBeTruthy();
  });

  it('supports optional fields', () => {
    const user: UserProfile = {
      id: 'user_guest_1',
      username: 'Guest',
      isOwner: false,
      color: '#FF6B6B',
      role: 'guest',
      createdAt: '2026-03-25T00:00:00.000Z',
      importedDate: '2026-03-25',
      importedFrom: 'mobile',
    };

    expect(user.isOwner).toBe(false);
    expect(user.color).toBe('#FF6B6B');
    expect(user.role).toBe('guest');
    expect(user.importedDate).toBe('2026-03-25');
    expect(user.importedFrom).toBe('mobile');
  });

  it('createdAt accepts both number and string', () => {
    const numProfile: UserProfile = { id: 'u1', username: 'A', createdAt: 1711324800000 };
    const strProfile: UserProfile = { id: 'u2', username: 'B', createdAt: '2026-03-25T00:00:00.000Z' };
    expect(typeof numProfile.createdAt).toBe('number');
    expect(typeof strProfile.createdAt).toBe('string');
  });
});

// ==================== SYNC TYPES ====================

describe('SyncEnvelopeV2 structure', () => {
  it('has version 2.0, type, source, encrypted, exportDate, categories, dateRange, data', () => {
    const envelope = makeEnvelope();
    expect(envelope.version).toBe('2.0');
    expect(['sync', 'archive']).toContain(envelope.type);
    expect(['mobile', 'pwa']).toContain(envelope.source);
    expect(typeof envelope.encrypted).toBe('boolean');
    expect(envelope.exportDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(envelope.categories)).toBe(true);
    expect(envelope.dateRange).toHaveProperty('startDate');
    expect(envelope.dateRange).toHaveProperty('endDate');
    expect(envelope.data).toBeDefined();
  });

  it('sync type includes codeHash, archive type omits it', () => {
    const sync = makeEnvelope({ type: 'sync', codeHash: 'sha256hash' });
    expect(sync.codeHash).toBe('sha256hash');

    const archive = makeEnvelope({ type: 'archive', codeHash: undefined });
    expect(archive.codeHash).toBeUndefined();
  });
});

describe('SyncPayload structure', () => {
  it('has all 10 array fields', () => {
    const payload = makeEmptyPayload();
    const expectedKeys = [
      'dining', 'equipment', 'outfits', 'photos', 'places',
      'rides', 'shopping', 'shows', 'sundries', 'wishes',
    ];
    expect(Object.keys(payload).sort()).toEqual(expectedKeys);
  });

  it('empty payload is valid with all empty arrays', () => {
    const payload = makeEmptyPayload();
    for (const value of Object.values(payload)) {
      expect(Array.isArray(value)).toBe(true);
      expect(value).toHaveLength(0);
    }
  });
});

describe('SyncRide', () => {
  it('has date field with YYYY-MM-DD format', () => {
    const ride: SyncRide = {
      id: 'ride-1',
      name: 'Matterhorn Bobsleds',
      park: 'disneyland',
      land: 'Fantasyland',
      priority: 'D',
      completed: false,
      date: '2026-04-02',
    };
    expect(ride.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('SyncShow', () => {
  it('has date field and optional showTime', () => {
    const show: SyncShow = {
      id: 'show-1',
      name: 'Fantasmic!',
      park: 'disneyland',
      land: 'Frontierland',
      priority: 'E',
      completed: false,
      date: '2026-04-01',
      showTime: '9:00 PM',
      timeType: 'fixed',
    };
    expect(show.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(show.showTime).toBe('9:00 PM');
    expect(show.timeType).toBe('fixed');
  });
});

describe('SyncDining', () => {
  it('has date field and optional reservation fields', () => {
    const dining: SyncDining = {
      id: 'dining-1',
      name: 'Blue Bayou',
      park: 'disneyland',
      land: 'New Orleans Square',
      priority: 'D',
      completed: false,
      date: '2026-04-01',
      time: '6:30 PM',
      type: 'reservation',
      reservationConfirmation: 'RES-789',
      partySize: 4,
      dietaryNotes: 'Vegetarian option needed',
    };
    expect(dining.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dining.type).toBe('reservation');
    expect(dining.partySize).toBe(4);
  });
});

describe('SyncShoppingItem extends SyncPackingItem', () => {
  it('has base packing fields plus price, shops, url, purchased', () => {
    const item: SyncShoppingItem = {
      id: 'shop-1',
      name: 'Spirit Jersey',
      category: 'Clothing & Accessories',
      priority: 'C',
      completed: false,
      date: '2026-04-01',
      price: '$74.99',
      shops: ['world-of-disney', 'emporium'],
      url: 'https://shopdisney.com/spirit-jersey',
      purchased: false,
    };

    // SyncPackingItem base fields
    expect(item.id).toBeTruthy();
    expect(item.name).toBeTruthy();
    expect(item.category).toBeTruthy();
    expect(item.priority).toBeTruthy();
    expect(typeof item.completed).toBe('boolean');
    expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Shopping-specific fields
    expect(item.price).toBe('$74.99');
    expect(item.shops).toEqual(['world-of-disney', 'emporium']);
    expect(item.url).toContain('shopdisney');
    expect(item.purchased).toBe(false);
  });

  it('shopping-specific fields are all optional', () => {
    const minimal: SyncShoppingItem = {
      id: 'shop-2',
      name: 'Pin',
      category: 'Collectibles',
      priority: 'B',
      completed: false,
      date: '2026-04-03',
    };
    expect(minimal.price).toBeUndefined();
    expect(minimal.shops).toBeUndefined();
    expect(minimal.url).toBeUndefined();
    expect(minimal.purchased).toBeUndefined();
  });
});

// ==================== SYNC ROUND-TRIP DATA INTEGRITY ====================

describe('Sync round-trip data integrity', () => {
  it('SyncEnvelopeV2 with sample data survives JSON serialize/parse', () => {
    const envelope = makeEnvelope({
      data: {
        rides: [{
          id: 'ride-sm',
          name: 'Space Mountain',
          park: 'disneyland',
          land: 'Tomorrowland',
          priority: 'E',
          maxWait: 45,
          completed: false,
          date: '2026-04-01',
        }],
        shows: [{
          id: 'show-fan',
          name: 'Fantasmic!',
          park: 'disneyland',
          land: 'Frontierland',
          showTime: '9:00 PM',
          priority: 'E',
          completed: false,
          date: '2026-04-01',
        }],
        dining: [{
          id: 'din-bb',
          name: 'Blue Bayou',
          park: 'disneyland',
          land: 'New Orleans Square',
          priority: 'D',
          completed: false,
          date: '2026-04-02',
          type: 'reservation',
          partySize: 4,
        }],
        wishes: [{
          id: 'wish-1',
          title: 'Get a Dole Whip',
          tags: ['eats', 'photos'],
          priority: 'C',
          completed: false,
          date: '2026-04-01',
        }],
        outfits: [{
          id: 'out-1',
          name: 'Castle day outfit',
          category: 'Day Wear',
          priority: 'C',
          completed: false,
          date: '2026-04-01',
        }],
        equipment: [{
          id: 'eq-1',
          name: 'Portable battery pack',
          category: 'Electronics',
          priority: 'D',
          completed: true,
          date: '2026-04-01',
        }],
        sundries: [{
          id: 'su-1',
          name: 'Sunscreen SPF 50',
          category: 'Skincare',
          priority: 'E',
          completed: false,
          date: '2026-04-01',
        }],
        shopping: [{
          id: 'sh-1',
          name: 'Mickey Ears',
          category: 'Clothing & Accessories',
          priority: 'C',
          completed: false,
          date: '2026-04-01',
          shops: ['mad-hatter', 'emporium'],
          price: '$34.99',
          purchased: false,
        }],
        photos: [{
          id: 'photo-1',
          data: 'data:image/jpeg;base64,/9j/4AAQ',
          mimeType: 'image/jpeg',
          itemId: 'out-1',
          itemType: 'outfit',
        }],
        places: [{
          id: 'place-1',
          name: 'Partners Statue',
          park: 'disneyland',
          land: 'Hub',
          priority: 'C',
          completed: false,
          date: '2026-04-01',
          latitude: 33.8125,
          longitude: -117.919,
        }],
      },
    });

    const json = JSON.stringify(envelope);
    const parsed = JSON.parse(json) as SyncEnvelopeV2;

    // Envelope-level fields
    expect(parsed.version).toBe('2.0');
    expect(parsed.type).toBe('sync');
    expect(parsed.source).toBe('mobile');
    expect(parsed.encrypted).toBe(false);
    expect(parsed.exportDate).toBe('2026-03-25T10:00:00.000Z');
    expect(parsed.categories).toEqual(['rides', 'wishes']);
    expect(parsed.dateRange).toEqual({ startDate: '2026-04-01', endDate: '2026-04-05' });

    // All 9 payload arrays present with correct lengths
    expect(parsed.data.rides).toHaveLength(1);
    expect(parsed.data.shows).toHaveLength(1);
    expect(parsed.data.dining).toHaveLength(1);
    expect(parsed.data.wishes).toHaveLength(1);
    expect(parsed.data.outfits).toHaveLength(1);
    expect(parsed.data.equipment).toHaveLength(1);
    expect(parsed.data.sundries).toHaveLength(1);
    expect(parsed.data.shopping).toHaveLength(1);
    expect(parsed.data.photos).toHaveLength(1);

    // Spot-check nested data
    expect(parsed.data.rides[0].name).toBe('Space Mountain');
    expect(parsed.data.rides[0].maxWait).toBe(45);
    expect(parsed.data.dining[0].partySize).toBe(4);
    expect(parsed.data.photos[0].mimeType).toBe('image/jpeg');
  });

  it('dates survive JSON round-trip as strings', () => {
    const envelope = makeEnvelope({
      exportDate: '2026-03-25T15:30:00.000Z',
      dateRange: { startDate: '2026-04-01', endDate: '2026-04-05' },
      data: {
        ...makeEmptyPayload(),
        rides: [{
          id: 'r1', name: 'Ride', park: 'disneyland', land: 'Land',
          priority: 'C', completed: false, date: '2026-04-03',
        }],
      },
    });

    const parsed = JSON.parse(JSON.stringify(envelope)) as SyncEnvelopeV2;

    expect(parsed.exportDate).toBe('2026-03-25T15:30:00.000Z');
    expect(parsed.dateRange.startDate).toBe('2026-04-01');
    expect(parsed.dateRange.endDate).toBe('2026-04-05');
    expect(parsed.data.rides[0].date).toBe('2026-04-03');
  });

  it('nested arrays (tags, shops) survive JSON round-trip', () => {
    const envelope = makeEnvelope({
      data: {
        ...makeEmptyPayload(),
        wishes: [{
          id: 'w1', title: 'Multi-tag wish',
          tags: ['rides', 'photos', 'characters'],
          priority: 'E', completed: false, date: '2026-04-01',
        }],
        shopping: [{
          id: 'sh1', name: 'Merch', category: 'Souvenirs',
          priority: 'B', completed: false, date: '2026-04-01',
          shops: ['emporium', 'world-of-disney', 'star-trader'],
        }],
      },
    });

    const parsed = JSON.parse(JSON.stringify(envelope)) as SyncEnvelopeV2;

    expect(parsed.data.wishes[0].tags).toEqual(['rides', 'photos', 'characters']);
    expect(parsed.data.shopping[0].shops).toEqual(['emporium', 'world-of-disney', 'star-trader']);
  });
});

// ==================== COMMON TYPES ====================

describe('Priority values', () => {
  it('accepts all five tiers A through E', () => {
    const priorities: Priority[] = ['A', 'B', 'C', 'D', 'E'];
    expect(priorities).toHaveLength(5);
    // Verify each is a single uppercase letter
    for (const p of priorities) {
      expect(p).toMatch(/^[A-E]$/);
    }
  });
});

describe('ParkKey values', () => {
  it('covers all 6 Disneyland Resort locations', () => {
    const parkKeys: ParkKey[] = [
      'disneyland',
      'californiaadventure',
      'downtown',
      'grandcalifornian',
      'disneyland_hotel',
      'pixar_place_hotel',
    ];
    expect(parkKeys).toHaveLength(6);

    // Verify all are lowercase strings (no spaces or special chars besides underscore)
    for (const key of parkKeys) {
      expect(key).toMatch(/^[a-z_]+$/);
    }
  });
});
