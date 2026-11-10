"use client";

// ==================== COLLECTION CLOUD SYNC ====================
// The collection in Cloud Sync (dland-wishes docs/collections-design.md §8,
// §8b): users/{uid}/collectionItems/{itemId} and
// users/{uid}/collectionSettings/settings, encrypted with the account key,
// photos as thumbnails only. The rules (what travels, how a cloud copy lands,
// what startup pushes) are shared with Pal in @shared/collection-sync.
//
// The first download on a browser reads every item in pages and reports its
// progress (useCollectionRestore); after that each start reads only documents
// written since the newest one seen (serverUpdatedAt, the server's time, kept
// per account in localStorage), and the listener only receives changes.
// wish-sync's startSync starts this for an Apple account while Collections
// are available, and stopSync stops it.

import {
  collection, doc, getCountFromServer, getDoc, getDocs, getFirestore, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, startAfter, Timestamp, where,
  type DocumentData, type Query, type QueryDocumentSnapshot, type Unsubscribe,
} from "firebase/firestore";
import { useSyncExternalStore } from "react";
import app from "./firebase";
import db, { type CollectionItem, type CollectionSettings } from "./db";
import {
  COLLECTION_SETTINGS_ID, onCollectionWrite, readCollectionPending, settingsFromRecord, updateCollectionPending,
  type CollectionWrite,
} from "./collection-store";
import { decrypt, deriveKey, encrypt } from "@shared/sync/crypto";
import type { SyncedCollectionDoc } from "@shared/sync/firestore-schema";
import type { RemoteStamp } from "@shared/sync-helpers";
import {
  COLLECTION_ITEMS_COLLECTION, COLLECTION_PAGE_SIZE, COLLECTION_SETTINGS_COLLECTION, COLLECTION_SETTINGS_DOC,
  MAX_COLLECTION_PAYLOAD_CHARS, collectionDocStamp, collectionItemForCloud, collectionItemFromCloud,
  collectionSettingsFromCloud, collectionSettingsNeedPushBack, collectionStartupPush, shouldPushCollectionSettings,
} from "@shared/collection-sync";

const firestore = getFirestore(app);

// ==================== PATHS AND KEY ====================

const itemsCol = (uid: string) => collection(firestore, "users", uid, COLLECTION_ITEMS_COLLECTION);
const itemDoc = (uid: string, id: string) => doc(firestore, "users", uid, COLLECTION_ITEMS_COLLECTION, id);
const settingsDoc = (uid: string) => doc(firestore, "users", uid, COLLECTION_SETTINGS_COLLECTION, COLLECTION_SETTINGS_DOC);

let _keyCache: { uid: string; key: Uint8Array } | null = null;

async function getKey(uid: string): Promise<Uint8Array> {
  if (_keyCache?.uid === uid) return _keyCache.key;
  const key = await deriveKey(uid);
  _keyCache = { uid, key };
  return key;
}

// ==================== WATERMARK ====================
// The server time of the newest document this browser has applied, per account.

const watermarkKey = (uid: string) => `parqwish-collection-watermark:${uid}`;

function readWatermark(uid: string): number | undefined {
  try {
    const ms = Number(localStorage.getItem(watermarkKey(uid)));
    return Number.isFinite(ms) && ms > 0 ? ms : undefined;
  } catch { return undefined; }
}

/** The server time of the first document this run couldn't apply: no watermark at or past it is saved, so the next start reads it again. */
let _failureFloor: number | undefined;

function noteFailure(ms: number | undefined): void {
  if (ms && ms < (_failureFloor ?? Infinity)) _failureFloor = ms;
}

function writeWatermark(uid: string, ms: number | undefined): void {
  const capped = ms && _failureFloor ? Math.min(ms, _failureFloor - 1) : ms;
  if (!capped) return;
  try { localStorage.setItem(watermarkKey(uid), String(Math.max(capped, readWatermark(uid) ?? 0))); } catch (err) {
    console.error("[collection-cloud] the watermark couldn't be saved:", err);
  }
}

function serverMillis(data: DocumentData): number | undefined {
  return data.serverUpdatedAt instanceof Timestamp ? data.serverUpdatedAt.toMillis() : undefined;
}

// ==================== RESTORE PROGRESS ====================

export interface CollectionRestore { done: number; total: number }

let _restore: CollectionRestore | null = null;
const _restoreListeners = new Set<() => void>();

function setRestore(next: CollectionRestore | null): void {
  _restore = next;
  _restoreListeners.forEach((l) => l());
}

/** The first download's progress ("Restoring your collection… 600 of 2,000"), or null when there's none. */
export function useCollectionRestore(): CollectionRestore | null {
  return useSyncExternalStore(
    (l) => { _restoreListeners.add(l); return () => _restoreListeners.delete(l); },
    () => _restore, () => null,
  );
}

// ==================== PUSH ====================

async function pushItem(item: CollectionItem, uid: string): Promise<void> {
  const encryptedPayload = await encrypt(collectionItemForCloud(item), await getKey(uid));
  if (encryptedPayload.length > MAX_COLLECTION_PAYLOAD_CHARS) {
    throw new Error(`[collection-cloud] ${item.id} is too large to sync (${encryptedPayload.length} characters)`);
  }
  await setDoc(itemDoc(uid, item.id), {
    id: item.id, encryptedPayload, updatedAt: collectionDocStamp(item.updatedAt), serverUpdatedAt: serverTimestamp(),
  } satisfies SyncedCollectionDoc);
}

async function pushDelete(id: string, uid: string): Promise<void> {
  const now = new Date().toISOString();
  await setDoc(itemDoc(uid, id), {
    id, encryptedPayload: "", updatedAt: now, deletedAt: now, serverUpdatedAt: serverTimestamp(),
  } satisfies SyncedCollectionDoc);
}

async function pushSettings(settings: CollectionSettings, uid: string): Promise<void> {
  const encryptedPayload = await encrypt(settings, await getKey(uid));
  await setDoc(settingsDoc(uid), {
    id: COLLECTION_SETTINGS_DOC, encryptedPayload, updatedAt: collectionDocStamp(settings.updatedAt), serverUpdatedAt: serverTimestamp(),
  } satisfies SyncedCollectionDoc);
}

/** Push items and deletions, clearing each one's pending mark once it's in the cloud. */
async function pushItems(saved: CollectionItem[], deleted: string[], uid: string): Promise<void> {
  const results = await Promise.allSettled([
    ...saved.map((i) => pushItem(i, uid).then(() => i.id)),
    ...deleted.map((id) => pushDelete(id, uid).then(() => id)),
  ]);
  const sent = new Set(results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])));
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length) console.error(`[collection-cloud] ${failed.length} of ${results.length} pushes failed:`, failed[0].reason);
  if (sent.size) updateCollectionPending((p) => ({ ...p, items: Object.fromEntries(Object.entries(p.items).filter(([id]) => !sent.has(id))) }));
}

async function pushSettingsNow(settings: CollectionSettings, uid: string): Promise<void> {
  try {
    await pushSettings(settings, uid);
    updateCollectionPending((p) => ({ ...p, settings: false }));
  } catch (err) {
    console.error("[collection-cloud] settings push failed:", err);
  }
}

// ==================== APPLY ====================

/** Apply one item document from the cloud; returns its stamp. Throws if it can't be read. */
async function applyItemDoc(data: DocumentData, key: Uint8Array): Promise<RemoteStamp> {
  const remote = data as SyncedCollectionDoc;
  const stamp = { updatedAt: remote.updatedAt, deletedAt: remote.deletedAt };
  if (remote.deletedAt) {
    await db.collectionItems.delete(remote.id);
    return stamp;
  }
  const incoming = await decrypt<CollectionItem>(remote.encryptedPayload, key);
  if (!incoming) throw new Error(`couldn't decrypt item ${remote.id}`);
  const next = collectionItemFromCloud(incoming, remote.updatedAt, await db.collectionItems.get(remote.id));
  if (next) await db.collectionItems.put(next);
  return stamp;
}

/** Merge the cloud's settings into the stored ones (part by part), in one transaction; returns them as stored after. */
function mergeSettings(incoming: CollectionSettings): Promise<CollectionSettings | undefined> {
  return db.transaction("rw", db.collectionSettings, async () => {
    const record = await db.collectionSettings.get(COLLECTION_SETTINGS_ID);
    const local = record ? settingsFromRecord(record, Date.now()) : undefined;
    const next = collectionSettingsFromCloud(incoming, local);
    if (next) await db.collectionSettings.put({ ...next, id: COLLECTION_SETTINGS_ID });
    return next ?? local;
  });
}

/**
 * Merge the cloud's settings in; when this browser had newer parts, push the
 * merged settings back so both apps end up the same.
 */
async function applySettingsDoc(data: DocumentData | undefined, key: Uint8Array, uid: string): Promise<RemoteStamp | undefined> {
  if (!data) return undefined;
  const remote = data as SyncedCollectionDoc;
  const incoming = await decrypt<CollectionSettings>(remote.encryptedPayload, key);
  if (!incoming) { console.error("[collection-cloud] couldn't decrypt the collection settings"); return { updatedAt: remote.updatedAt }; }
  const stored = await mergeSettings(incoming);
  if (stored && collectionSettingsNeedPushBack(stored, incoming)) {
    await pushSettings(stored, uid).catch((err) => console.error("[collection-cloud] pushing merged settings failed:", err));
  }
  return { updatedAt: remote.updatedAt };
}

// ==================== PULL ====================

/** Items written since `since` (all of them without), oldest first. */
function changesSince(uid: string, since: number | undefined): Query {
  const base = since ? [where("serverUpdatedAt", ">=", Timestamp.fromMillis(since))] : [];
  return query(itemsCol(uid), ...base, orderBy("serverUpdatedAt"));
}

interface PullResult { stamps: Map<string, RemoteStamp>; newest: number | undefined }

/** Apply documents one by one; one that fails is logged, skipped and noted (noteFailure). Returns the newest applied. */
async function applyItemDocs(docs: DocumentData[], key: Uint8Array, stamps: Map<string, RemoteStamp>): Promise<number | undefined> {
  let newest: number | undefined;
  for (const data of docs) {
    const ms = serverMillis(data);
    try {
      stamps.set(data.id, await applyItemDoc(data, key));
      if (ms && ms > (newest ?? 0)) newest = ms;
    } catch (err) {
      console.error(`[collection-cloud] item ${data.id} could not be applied (tried again next start):`, err);
      noteFailure(ms);
    }
  }
  return newest;
}

/** Read changed items in pages, applying each, with progress for a large download. */
async function pullItems(uid: string, key: Uint8Array, since: number | undefined): Promise<PullResult> {
  const changes = changesSince(uid, since);
  const total = (await getCountFromServer(changes)).data().count;
  const stamps = new Map<string, RemoteStamp>();
  let newest: number | undefined;
  let last: QueryDocumentSnapshot | undefined;
  if (total > COLLECTION_PAGE_SIZE) setRestore({ done: 0, total });
  try {
    for (;;) {
      const page = await getDocs(query(changes, ...(last ? [startAfter(last)] : []), limit(COLLECTION_PAGE_SIZE)));
      const applied = await applyItemDocs(page.docs.map((d) => d.data()), key, stamps);
      if (applied && applied > (newest ?? 0)) newest = applied;
      if (_restore) setRestore({ done: Math.min(total, stamps.size), total });
      if (page.docs.length < COLLECTION_PAGE_SIZE) break;
      last = page.docs[page.docs.length - 1];
    }
  } finally {
    setRestore(null);
  }
  return { stamps, newest };
}

// ==================== SYNC ENGINE ====================

let _unsubscribe: Unsubscribe[] = [];
let _stopping = false;
/** Bumped by every start and stop, so a start still downloading when sync stops goes no further. */
let _run = 0;

/** Push what the pull says this browser has newer: everything compared on a first sync, pending changes after. */
async function pushAfterPull(uid: string, pulled: PullResult, settingsStamp: RemoteStamp | undefined, firstSync: boolean): Promise<void> {
  const pending = readCollectionPending();
  const plan = collectionStartupPush(await db.collectionItems.toArray(), pulled.stamps, pending.items, firstSync);
  if (plan.settled.length) {
    const settled = new Set(plan.settled);
    updateCollectionPending((p) => ({ ...p, items: Object.fromEntries(Object.entries(p.items).filter(([id]) => !settled.has(id))) }));
  }
  await pushItems(plan.save, plan.delete, uid);
  const record = await db.collectionSettings.get(COLLECTION_SETTINGS_ID);
  const settings = record ? settingsFromRecord(record, Date.now()) : undefined;
  if ((firstSync || pending.settings) && shouldPushCollectionSettings(settings, settingsStamp)) await pushSettingsNow(settings!, uid);
  console.log(`[collection-cloud] pulled ${pulled.stamps.size}, pushed ${plan.save.length} items and ${plan.delete.length} deletions`);
}

function listen(uid: string, key: Uint8Array): void {
  const since = readWatermark(uid);
  const onError = (what: string) => (err: Error) => { if (!_stopping) console.error(`[collection-cloud] ${what} listener error:`, err); };
  _unsubscribe.push(onSnapshot(changesSince(uid, since), async (snap) => {
    // "removed" means a document left the query, not a deletion (deletions are tombstones)
    const docs = snap.docChanges().filter((c) => c.type !== "removed").map((c) => c.doc.data());
    if (!docs.length) return;
    writeWatermark(uid, await applyItemDocs(docs, key, new Map()));
  }, onError("items")));
  _unsubscribe.push(onSnapshot(settingsDoc(uid), (snap) => {
    applySettingsDoc(snap.data(), key, uid).catch((err) => console.error("[collection-cloud] applying settings failed:", err));
  }, onError("settings")));
}

/** Push each local write as it happens, while sync runs. */
function pushWrites(uid: string): (write: CollectionWrite) => void {
  return (write) => {
    if (write.saved?.length || write.deleted?.length) void pushItems(write.saved ?? [], write.deleted ?? [], uid);
    if (write.settings) void pushSettingsNow(write.settings, uid);
  };
}

/** Pull, push this browser's changes, then listen. Call for an Apple account (wish-sync's startSync). */
export async function startCollectionSync(uid: string): Promise<void> {
  stopCollectionSync();
  const run = _run;
  const key = await getKey(uid);
  const since = readWatermark(uid);
  const settingsStamp = await applySettingsDoc((await getDoc(settingsDoc(uid))).data(), key, uid);
  const pulled = await pullItems(uid, key, since);
  if (run !== _run) return;
  writeWatermark(uid, pulled.newest);
  onCollectionWrite(pushWrites(uid));
  await pushAfterPull(uid, pulled, settingsStamp, since === undefined);
  if (run !== _run) return;
  listen(uid, key);
}

export function stopCollectionSync(): void {
  _run++;
  _failureFloor = undefined;
  _stopping = true;
  onCollectionWrite(null);
  _unsubscribe.forEach((u) => u());
  _unsubscribe = [];
  setTimeout(() => { _stopping = false; }, 500);
}
