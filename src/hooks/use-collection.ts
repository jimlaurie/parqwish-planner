// ==================== USE COLLECTION ====================
// The collection's settings and items, live from IndexedDB. `settings` is
// undefined while loading, then the stored settings (or empty ones).

import { useLiveQuery } from "dexie-react-hooks";
import db, { type CollectionItem, type CollectionSettings } from "@/lib/db";
import { COLLECTION_SETTINGS_ID, settingsFromRecord } from "@/lib/collection-store";

export function useCollection(): { settings: CollectionSettings | undefined; items: CollectionItem[] } {
  const settings = useLiveQuery(
    async () => settingsFromRecord(await db.collectionSettings.get(COLLECTION_SETTINGS_ID), Date.now()),
    [],
  );
  const items = useLiveQuery(() => db.collectionItems.toArray(), [], [] as CollectionItem[]);
  return { settings, items };
}
