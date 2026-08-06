/**
 * shared/sync/crypto.ts
 *
 * AES-GCM-256 encrypt/decrypt for cross-platform Firestore sync.
 *
 * Uses @noble/ciphers (AES-GCM) and @noble/hashes (HKDF-SHA256).
 * Pure JavaScript — no Web Crypto API dependency.
 * Works in: browsers, React Native / Hermes, Node.js.
 *
 * Key derivation: HKDF-SHA256(uid, salt="parqwish-v1", info="parqwish-sync-v1")
 * Same UID on any device → same key → data encrypted on one device is
 * readable on another signed in with the same Apple ID.
 *
 * Random IV: uses an injectable provider so platform-specific secure
 * randomness can be supplied (expo-crypto on mobile, crypto.getRandomValues
 * on web). Set via setRandomBytesProvider() before first encrypt call.
 */

import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

const IV_BYTES = 12;
const KEY_BYTES = 32;

// ==================== RANDOM BYTES PROVIDER ====================

/**
 * Default IV provider: tries globalThis.crypto.getRandomValues (browsers,
 * newer Hermes), falls back to Math.random (insecure but non-crashing).
 * Replace with expo-crypto on mobile via setRandomBytesProvider().
 */
let _getRandomBytes: (n: number) => Uint8Array = (n: number) => {
  const bytes = new Uint8Array(n);
  const g = typeof globalThis !== "undefined" ? (globalThis as Record<string, unknown>) : {};
  const c = g["crypto"] as { getRandomValues?: (arr: Uint8Array) => Uint8Array } | undefined;
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    // Fallback — should only trigger when proper provider not injected
    for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

/** Inject a platform-specific secure random bytes provider. */
export function setRandomBytesProvider(fn: (n: number) => Uint8Array): void {
  _getRandomBytes = fn;
}

// ==================== BASE64 HELPERS ====================

// Chunk-based encoding avoids spread operator stack overflow for large arrays.
export function toBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ==================== KEY DERIVATION ====================

/**
 * Derive a 256-bit AES key (Uint8Array) from a Firebase UID.
 * Deterministic: same UID always produces the same key material.
 */
export async function deriveKey(uid: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  return hkdf(
    sha256,
    enc.encode(uid),
    enc.encode("parqwish-v1"),
    enc.encode("parqwish-sync-v1"),
    KEY_BYTES
  );
}

// ==================== ENVELOPE ENCRYPTION (Phase D) ====================
//
// Shared trips need a key that isn't tied to any single account's UID —
// two different Firebase accounts must both be able to reach it, but
// neither's UID should let a third party derive it. The fix: generate one
// random key per trip and "wrap" (encrypt) a copy of it for each member
// using that member's own existing UID-derived key. Trip content is
// encrypted with the trip key exactly once and never re-encrypted as
// membership changes — only the set of wrapped copies changes.

/** Generate a fresh random 256-bit key, e.g. for a newly-created trip. */
export function generateRandomKey(): Uint8Array {
  return _getRandomBytes(KEY_BYTES);
}

/**
 * Wrap a raw key for storage — encrypt it with wrapperKey so only whoever
 * can derive wrapperKey (e.g. via deriveKey(uid)) can recover it.
 */
export async function wrapKey(rawKey: Uint8Array, wrapperKey: Uint8Array): Promise<string> {
  return encrypt({ k: toBase64(rawKey) }, wrapperKey);
}

/**
 * Unwrap a key produced by wrapKey(). Returns null if wrapperKey is wrong
 * or the ciphertext is malformed (mirrors decrypt()'s fail-soft behavior).
 */
export async function unwrapKey(wrapped: string, wrapperKey: Uint8Array): Promise<Uint8Array | null> {
  const decrypted = await decrypt<{ k: string }>(wrapped, wrapperKey);
  return decrypted ? fromBase64(decrypted.k) : null;
}

// ==================== ENCRYPT ====================

/**
 * Encrypt a JSON-serialisable payload with AES-GCM-256.
 * Returns base64(12-byte IV || ciphertext || 16-byte GCM auth tag).
 */
export async function encrypt(
  payload: unknown,
  key: Uint8Array
): Promise<string> {
  const iv = _getRandomBytes(IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const cipher = gcm(key, iv);
  const ciphertext = cipher.encrypt(plaintext);

  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);

  return toBase64(combined);
}

// ==================== DECRYPT ====================

/**
 * Decrypt a base64 string produced by encrypt().
 * Returns the original payload, or null if decryption fails.
 */
export async function decrypt<T = unknown>(
  encoded: string,
  key: Uint8Array
): Promise<T | null> {
  try {
    const combined = fromBase64(encoded);
    const iv = combined.slice(0, IV_BYTES);
    const ciphertext = combined.slice(IV_BYTES);

    const cipher = gcm(key, iv);
    const plaintext = cipher.decrypt(ciphertext);

    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}
