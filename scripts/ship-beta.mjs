#!/usr/bin/env node

/**
 * Ships a beta of the Planner to the Firebase Hosting preview channel "beta"
 * (https://parqwish-app--beta-<hash>.web.app), beside production: built with
 * the hidden features on (Collections), never touching app.parqwish.com.
 *
 *   npm run ship:beta              checks, build with the beta flags, deploy to the channel
 *   npm run ship:beta -- --check   only the checks
 *
 * Unlike `npm run ship`: no version bump, no park data download (the beta
 * reads live data, falling back to the copy in public/data), no commit. The
 * channel expires 30 days after each deploy, so ship again to keep it.
 *
 * The channel's address must be in Firebase Auth's authorized domains (Sign in
 * with Apple) and in the Storage CORS origins (live park data), or the beta
 * quietly behaves differently from production.
 *
 * Beta and production share Firestore and Cloud Functions: a beta may only
 * add paths and fields, never change what existing ones mean.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { connect } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANNEL = "beta";
const EXPIRES = "30d";
/** What the beta turns on (src/lib/feature-flags.ts). */
const BETA_FLAGS = { NEXT_PUBLIC_COLLECTIONS: "1" };
const FIREBASE_KEYS = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"];
const CHECK_ONLY = process.argv.includes("--check");

// ==================== HELPERS ====================

function fail(message, hint) {
  console.error(`\n✗ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

function run(cmd, cmdArgs, env = {}) {
  return spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } }).status === 0;
}

function out(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(" ")}: ${r.stderr || r.stdout}`);
  return r.stdout;
}

// ==================== CHECKS ====================

function checkBranchAndTree() {
  const branch = out("git", ["branch", "--show-current"]).trim();
  if (branch !== "main") {
    fail(`On branch "${branch}", not main.`, branch === "partner-demo"
      ? "partner-demo is a local-only demo branch and must never be deployed anywhere."
      : "Ship the beta from main: git checkout main.");
  }
  const changed = out("git", ["status", "--porcelain", "--untracked-files=no"]).split("\n").filter(Boolean);
  if (changed.length) fail(`Uncommitted changes: ${changed.map((l) => l.slice(3)).join(", ")}`, "Commit first, so the beta is a known commit.");
  if (!run("git", ["fetch", "--quiet", "origin", "main"])) fail("Couldn't fetch origin/main.");
  const behind = Number(out("git", ["rev-list", "--count", "HEAD..origin/main"]).trim());
  const ahead = Number(out("git", ["rev-list", "--count", "origin/main..HEAD"]).trim());
  if (behind || ahead) fail(`main is ${ahead} ahead and ${behind} behind origin/main.`, "Push or pull first, so the beta matches what's on GitHub.");
}

function checkEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) fail(".env.local is missing.", "Without it the build has placeholder Firebase config and sign-in breaks.");
  const text = readFileSync(path, "utf8");
  const missing = FIREBASE_KEYS.filter((k) => !new RegExp(`^${k}=\\S`, "m").test(text));
  if (missing.length) fail(`.env.local is missing values for: ${missing.join(", ")}`);
}

function checkLintAndHeadless() {
  if (!run("npm", ["run", "lint", "--silent", "--", "--quiet"])) fail("Lint has errors.");
  console.log("  Running the headless checks (npm run check)…");
  if (!run("npx", ["playwright", "test", "--reporter=line"])) fail("A headless check failed.", "See the failure above.");
}

// ==================== DEPLOY ====================

function buildAndDeploy() {
  console.log(`\n▸ Build with ${Object.keys(BETA_FLAGS).join(", ")}`);
  if (!run("npm", ["run", "build", "--silent"], BETA_FLAGS)) fail("Build failed.");
  console.log(`\n▸ Deploy to the "${CHANNEL}" preview channel (expires in ${EXPIRES})`);
  const r = spawnSync("firebase", ["hosting:channel:deploy", CHANNEL, "--only", "pwa", "--expires", EXPIRES, "--json"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) fail("The channel deploy failed.", r.stderr || r.stdout);
  const result = JSON.parse(r.stdout).result ?? {};
  const site = Object.values(result)[0] ?? {};
  console.log(`\n✓ Beta deployed: ${site.url ?? "(see the Firebase console)"}${site.expireTime ? `, until ${site.expireTime}` : ""}`);
}

function devServerRunning() {
  return new Promise((resolve) => {
    const socket = connect(3000, "127.0.0.1");
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

// ==================== MAIN ====================

console.log("▸ Checks");
checkBranchAndTree();
checkEnv();
checkLintAndHeadless();
console.log("  ✓ Checks passed");
if (CHECK_ONLY) process.exit(0);
buildAndDeploy();
if (await devServerRunning()) console.warn("\n⚠ A dev server is running on :3000. The build replaced .next, so restart it.");
