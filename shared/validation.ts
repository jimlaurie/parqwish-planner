// ==================== SHARED VALIDATION HELPERS ====================
// Pure functions for validating sync data at import boundaries.
// Used by both mobile (utils/UniversalSync.ts, utils/SyncTranslate.ts)
// and PWA (web/src/lib/universal-sync.ts, web/src/lib/sync-translate.ts).

/** Validate a string is YYYY-MM-DD format and represents a real date. */
export function isValidDate(date: unknown): date is string {
  return typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !isNaN(new Date(date + 'T00:00:00').getTime());
}

/** Validate a non-empty string. */
export function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

/** Validate that a value is an array (possibly empty). */
export function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

/** Validate a SyncEnvelopeV2 has the minimum required structure. */
export function isValidEnvelope(obj: unknown): obj is { version: string; data: Record<string, unknown>; dateRange?: { startDate: string; endDate: string } } {
  if (!obj || typeof obj !== 'object') return false;
  const e = obj as Record<string, unknown>;
  if (!isNonEmptyString(e.version)) return false;
  if (!e.data || typeof e.data !== 'object') return false;
  return true;
}

/** Validate a sync item has required fields (all must be non-empty strings). */
export function hasRequiredFields<T extends Record<string, unknown>>(
  item: T,
  ...fields: string[]
): boolean {
  return fields.every(f => isNonEmptyString(item[f]));
}
