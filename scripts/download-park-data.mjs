#!/usr/bin/env node

/**
 * Downloads park data JSON files from Firebase Storage into public/data/.
 * Run manually to refresh: node scripts/download-park-data.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

const BASE_URL =
  "https://storage.googleapis.com/my-tour-guide-backend.firebasestorage.app/data";

const FILES = ["rides.json", "shows.json", "restaurants.json", "shops.json", "places.json", "landConfig.json"];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const file of FILES) {
    const url = `${BASE_URL}/${file}`;
    process.stdout.write(`Downloading ${file}...`);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(` FAILED (${res.status})`);
      continue;
    }
    const text = await res.text();
    writeFileSync(join(OUT_DIR, file), text);
    console.log(` OK (${(text.length / 1024).toFixed(1)} KB)`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
