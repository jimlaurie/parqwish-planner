#!/usr/bin/env node

/**
 * Bumps package.json's patch version. Runs automatically before every
 * `npm run deploy` (see package.json) so NEXT_PUBLIC_APP_VERSION and
 * out/version.json change on every deploy — that's what UpdateBanner and
 * the layout.tsx cache-busting check compare against to detect a new
 * version is live. Without a real bump, both silently no-op.
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "package.json");

const raw = readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);

const parts = pkg.version.split(".").map(Number);
if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
  console.error(`Unexpected version format: "${pkg.version}" (expected x.y.z)`);
  process.exit(1);
}
parts[2] += 1;
pkg.version = parts.join(".");

// Preserve the file's existing 2-space indent + trailing newline.
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`Bumped version to ${pkg.version}`);
