// ==================== SYNC PROTOCOL TYPES ====================
// Re-exported from shared data layer. PWA-specific runtime values below.

export type {
  SyncCategory,
  ImportMode,
  SyncEnvelopeV2,
  SyncEnvelopeV1,
  SyncPayload,
  SyncRide,
  SyncPlace,
  SyncShow,
  SyncDining,
  SyncWish,
  SyncPackingItem,
  SyncShoppingItem,
  SyncPhoto,
  PhotoManifestEntry,
  PhotoZipManifest,
  SyncTrail,
  SyncTrailPoint,
  SyncScheduledEvent,
  SyncDayItem,
} from "@shared/types/sync";

export type { CategoryMeta } from "@shared/constants/sync-categories";
export { CATEGORY_META, ALL_CATEGORIES } from "@shared/constants/sync-categories";

// ==================== PARK NAME MAPPING ====================
// Re-exported from shared constants

export { PARK_NAME_TO_KEY, PARK_KEY_TO_NAME } from "@shared/constants/parks";
