#!/usr/bin/env node

/**
 * Ships the Planner: checks, deploy, the "Bump version" commit, and a check
 * that the live site has the new version. Replaces the hand-typed
 * commit/push/deploy/commit chain, which twice left `main` unbuildable when
 * one step failed and the next ran anyway.
 *
 *   npm run ship              commit and push your feature first; then this
 *   npm run ship -- --check   only the checks, no deploy
 *   npm run ship -- --retry   after the Firebase upload failed (e.g. a 503):
 *                             upload the build again and finish, no new bump
 *   npm run ship -- --skip-checks   skip the headless checks (urgent fixes only)
 *
 * Steps (each stops everything if it fails):
 *   1. Checks: on `main` (never `partner-demo`), no uncommitted changes to
 *      tracked files, not behind origin/main (pushes if ahead), .env.local
 *      has real Firebase values (a missing one shipped placeholder config
 *      twice), lint has no errors, the headless checks pass (npm run check,
 *      ~30 s; tests/e2e). Warns if shared/ differs from ../dland-wishes/shared.
 *   2. The four steps of `npm run deploy`, one at a time so a failure says
 *      which: bump version, download park data, build, Firebase upload.
 *   3. Commit "Bump version" (package.json, package-lock.json, public/data
 *      only) and push.
 *   4. Wait for https://app.parqwish.com/version.json to show the new
 *      version; warn if a dev server is running (the build replaced .next).
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { connect } from "node:net";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_URL = "https://app.parqwish.com/version.json";
const BUMP_FILES = ["package.json", "package-lock.json", "public/data"];
const FIREBASE_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const RETRY = args.has("--retry");
const SKIP_CHECKS = args.has("--skip-checks");

// ==================== HELPERS ====================

function fail(message, hint) {
  console.error(`\n✗ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

function step(title) {
  console.log(`\n▸ ${title}`);
}

/** Runs a command with its output shown; returns true if it succeeded. */
function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: "inherit" });
  return r.status === 0;
}

/** Runs a command quietly and returns its trimmed output (throws on failure). */
function out(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(" ")}: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

function version() {
  return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
}

/** Tracked files with uncommitted changes (staged or not); untracked files are ignored. */
function changedTrackedFiles() {
  // Not out(): its trim() would eat the leading space of " M path" lines
  const r = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) fail(`git status failed: ${r.stderr}`);
  return r.stdout.split("\n").filter(Boolean).map((l) => l.slice(3));
}

const isBumpFile = (f) => BUMP_FILES.some((b) => f === b || f.startsWith(`${b}/`));

// ==================== CHECKS ====================

function checkBranch() {
  const branch = out("git", ["branch", "--show-current"]);
  if (branch !== "main") {
    fail(`On branch "${branch}", not main.`, branch === "partner-demo"
      ? "partner-demo is a local-only demo branch and must never be deployed. git checkout main first."
      : "Ship from main: git checkout main.");
  }
}

function checkClean({ allowBumpFiles }) {
  const changed = changedTrackedFiles().filter((f) => !(allowBumpFiles && isBumpFile(f)));
  if (changed.length) {
    fail(`Uncommitted changes: ${changed.join(", ")}`,
      "Commit (and push) your feature first, or stash what isn't part of it. The deploy commits only the version bump.");
  }
}

function checkInSyncWithOrigin() {
  if (!run("git", ["fetch", "--quiet", "origin", "main"])) fail("Couldn't fetch origin/main.");
  const behind = Number(out("git", ["rev-list", "--count", "HEAD..origin/main"]));
  if (behind > 0) fail(`main is ${behind} commit(s) behind origin/main.`, "git pull --rebase, check it still builds, then ship.");
  const ahead = Number(out("git", ["rev-list", "--count", "origin/main..HEAD"]));
  if (ahead > 0) {
    console.log(`  Pushing ${ahead} unpushed commit(s) first.`);
    if (!run("git", ["push", "--quiet", "origin", "main"])) fail("git push failed.");
  }
}

function checkEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) fail(".env.local is missing.", "Without it the build ships placeholder Firebase config and sign-in and Cloud Sync break.");
  const env = Object.fromEntries(readFileSync(path, "utf8").split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
  const missing = FIREBASE_KEYS.filter((k) => !env[k]);
  if (missing.length) fail(`.env.local is missing values for: ${missing.join(", ")}`);
  if (/^demo|^000000/.test(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || env.NEXT_PUBLIC_FIREBASE_API_KEY.startsWith("demo")) {
    fail(".env.local has placeholder Firebase values.");
  }
}

function checkHeadless() {
  console.log("  Running the headless checks (npm run check)…");
  if (!run("npx", ["playwright", "test", "--reporter=line"])) {
    fail("A headless check failed.", "See the failure above (screenshot and trace in test-results/). Fix it, or ship with -- --skip-checks for an urgent fix.");
  }
}

function checkLint() {
  if (!run("npm", ["run", "lint", "--silent", "--", "--quiet"])) fail("Lint has errors.", "Fix them (warnings are fine) and ship again.");
}

/** Every file under a directory, relative to it, with a content hash. */
function hashTree(dir) {
  const files = new Map();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      // Tests run in dland-wishes (Jest); the Planner has no test runner
      if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files.set(relative(dir, p), createHash("sha1").update(readFileSync(p)).digest("hex"));
    }
  };
  walk(dir);
  return files;
}

/** Warns (doesn't stop) when shared/'s source differs from the private repo's copy (tests aren't compared). */
function warnSharedDrift() {
  const other = join(ROOT, "..", "dland-wishes", "shared");
  if (!existsSync(other)) return;
  const mine = hashTree(join(ROOT, "shared"));
  const theirs = hashTree(other);
  const differ = [...new Set([...mine.keys(), ...theirs.keys()])].filter((f) => mine.get(f) !== theirs.get(f));
  if (differ.length) {
    console.warn(`  ⚠ shared/ differs from ../dland-wishes/shared in ${differ.length} file(s): ${differ.slice(0, 5).join(", ")}${differ.length > 5 ? "…" : ""}`);
    console.warn("    Mirror the change if it's meant for both apps (see CLAUDE.md, \"shared/ is a copy\").");
  }
}

// ==================== DEPLOY ====================

function deploy() {
  step("Bump version");
  if (!run("node", ["scripts/bump-version.mjs"])) fail("Version bump failed.");
  const v = version();
  const undo = "Undo the bump with: git checkout package.json package-lock.json public/data";

  step("Download park data");
  if (!run("node", ["scripts/download-park-data.mjs"])) fail("Park data download failed.", undo);

  step(`Build ${v}`);
  if (!run("npm", ["run", "build", "--silent"])) fail("Build failed.", `${undo}, fix it, commit, and ship again.`);

  upload(v);
}

function upload(v) {
  step(`Upload ${v} to Firebase Hosting`);
  if (!run("firebase", ["deploy", "--only", "hosting:pwa"])) {
    fail("Firebase upload failed.", "If it was a temporary error (a 503, say): npm run ship -- --retry");
  }
}

function commitBump(v) {
  step(`Commit "Bump version" (${v})`);
  const toStage = BUMP_FILES.filter((f) => existsSync(join(ROOT, f)));
  if (!run("git", ["add", "--", ...toStage])) fail("git add failed.");
  const staged = out("git", ["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
  const stray = staged.filter((f) => !isBumpFile(f));
  if (stray.length) fail(`Unexpected files staged: ${stray.join(", ")}`, "Unstage them (git restore --staged <file>) and run: npm run ship -- --retry");
  if (!staged.length) {
    console.log("  Nothing to commit (already committed).");
  } else if (!run("git", ["commit", "--quiet", "-m", "Bump version"])) {
    fail("git commit failed.");
  }
  if (!run("git", ["push", "--quiet", "origin", "main"])) fail("git push failed.", "Push by hand: git push");
}

async function verifyLive(v) {
  step(`Check ${LIVE_URL}`);
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(`${LIVE_URL}?t=${Date.now()}`);
      const live = (await res.json()).version;
      if (live === v) { console.log(`  ✓ app.parqwish.com is on ${v}`); return; }
      console.log(`  Live is ${live}; waiting…`);
    } catch (err) {
      console.log(`  Couldn't read it (${err.message}); waiting…`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.warn(`  ⚠ app.parqwish.com didn't report ${v} within 30 s. Check it by hand.`);
}

function devServerRunning() {
  return new Promise((resolve) => {
    const socket = connect(3000, "127.0.0.1");
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

// ==================== MAIN ====================

step("Checks");
checkBranch();
checkClean({ allowBumpFiles: RETRY });
checkInSyncWithOrigin();
checkEnv();
warnSharedDrift();
if (!RETRY) checkLint();
if (!RETRY && !SKIP_CHECKS) checkHeadless();
console.log("  ✓ Checks passed");

if (CHECK_ONLY) {
  console.log("\n--check: stopping before the deploy.");
  process.exit(0);
}

if (RETRY) {
  const v = version();
  let built = null;
  try { built = JSON.parse(readFileSync(join(ROOT, "out", "version.json"), "utf8")).version; } catch { /* no build */ }
  if (built !== v) fail(`out/ holds ${built ?? "no build"}, not ${v}.`, "Build first (npm run build), then npm run ship -- --retry.");
  upload(v);
} else {
  deploy();
}

const v = version();
commitBump(v);
await verifyLive(v);
if (await devServerRunning()) {
  console.warn("\n⚠ A dev server is running on :3000. The build replaced .next, so restart it (npm run dev).");
}
console.log(`\n✓ Shipped ${v}`);
