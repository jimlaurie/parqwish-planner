// ==================== IMPORT TRACED ART ====================
// Turns the Home cards' traced artwork (art/home-illustrations/traced/*.svg,
// exported from Pixelmator Pro as hundreds of unnamed traced shapes over a
// hidden raster) into the markup the app renders
// (src/components/home/illustrations/generated/<scene>.ts):
//   - the hidden raster underlay and its clip path are dropped
//   - every path's own transform and the outer y-flip are baked into its
//     coordinates (300 x 400 canvas, one decimal), so a CSS transform can
//     animate any path without replacing a transform attribute
//   - near-flat gradients become solid fills; identical gradients are shared
//   - the moving parts in traced/motion.json are picked by path number (the
//     traced shapes have no names), and each run of consecutive paths in a
//     group is wrapped in a <g> carrying the animation; groups use
//     transform-box: view-box, so a part split across several runs still
//     moves as one around a single pivot
//   - "inserts" add art: patches behind moving parts (traced art leaves a
//     hole wherever a part sits, so hiding the part would show a gap),
//     clipped to the part's own shapes, and small fixes such as text
//   - "drop" removes paths outright (e.g. a logo the art shouldn't carry)
//   - ids are prefixed per scene so five inline SVGs can share one page
// Fails if a scene's path count no longer matches motion.json: a re-export
// renumbers the paths, so the motion has to be re-mapped.
//
// Usage: npm run illustrations:traced            (every scene)
//        npm run illustrations:traced -- plan    (just one)

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ART_DIR = path.join(ROOT, "art/home-illustrations/traced");
const OUT_DIR = path.join(ROOT, "src/components/home/illustrations/generated");

/** Trace space is 375 x 500 (y up); the card canvas is 300 x 400 (y down). */
const SCALE = 0.8;
const HEIGHT = 400;
/** Gradients whose stops differ by at most this much per channel become a solid fill. */
const FLAT_SPREAD = 8;

// ==================== PURE HELPERS ====================

export function round1(n) {
  const v = Math.round(n * 10) / 10;
  return (Object.is(v, -0) ? 0 : v).toString();
}

/** "12", 12 or "40-52" → path numbers. */
export function expandMembers(members) {
  const out = [];
  for (const m of members) {
    const range = /^(\d+)-(\d+)$/.exec(String(m));
    if (range) for (let i = +range[1]; i <= +range[2]; i++) out.push(i);
    else if (/^\d+$/.test(String(m))) out.push(+m);
    else throw new Error(`motion.json: "${m}" isn't a path number or range`);
  }
  return out;
}

function hexToRgb(c) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}

/** Largest per-channel difference between a gradient's stops. */
export function colorSpread(colors) {
  const rgb = colors.map(hexToRgb);
  return Math.max(...[0, 1, 2].map((k) => Math.max(...rgb.map((c) => c[k])) - Math.min(...rgb.map((c) => c[k]))));
}

/** Converts one traced path's d (absolute M/L/C/Z, local coords) into card coordinates. */
export function bakePath(d, tx, ty) {
  const toks = d.trim().split(/\s+/);
  let out = "";
  let last = "";
  for (let i = 0; i < toks.length; ) {
    const cmd = toks[i++];
    if (cmd === "Z") { out += "Z"; last = ""; continue; }
    if (cmd !== "M" && cmd !== "L" && cmd !== "C") throw new Error(`unexpected path command "${cmd}"`);
    const count = cmd === "C" ? 3 : 1;
    const pts = [];
    for (let k = 0; k < count; k++) {
      const x = +toks[i++];
      const y = +toks[i++];
      pts.push(`${round1(SCALE * (tx + x))} ${round1(HEIGHT - SCALE * (ty + y))}`);
    }
    const seg = pts.join(" ");
    if (cmd === "L" && seg === last) continue;
    last = pts[pts.length - 1];
    out += cmd + seg.replace(/ -/g, "-");
  }
  return out;
}

export function bbox(ds) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of ds) {
    const n = d.match(/-?\d+\.?\d*/g).map(Number);
    for (let k = 0; k + 1 < n.length; k += 2) {
      x0 = Math.min(x0, n[k]); x1 = Math.max(x1, n[k]);
      y0 = Math.min(y0, n[k + 1]); y1 = Math.max(y1, n[k + 1]);
    }
  }
  return { x0, y0, x1, y1 };
}

/** Pivot in card coordinates: [x, y], or a named point of the group's box. */
export function pivot(origin, b) {
  if (Array.isArray(origin)) return origin;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  if (origin === "bottom") return [cx, b.y1];
  if (origin === "top") return [cx, b.y0];
  if (origin === "left") return [b.x0, cy];
  if (origin === "top-left") return [b.x0, b.y0];
  return [cx, cy];
}

export function motionStyle(g, origin) {
  const vars = [`--d:${g.delay ?? 0}s`, `--t:${g.duration ?? 0.6}s`];
  if (g.repeat) vars.push(`--n:${g.repeat}`);
  if (g.rotate !== undefined) vars.push(`--r:${g.rotate}deg`);
  if (g.translate) vars.push(`--gx:${g.translate[0]}px`, `--gy:${g.translate[1] ?? 0}px`);
  vars.push(`--ox:${round1(origin[0])}px`, `--oy:${round1(origin[1])}px`);
  return vars.join(";");
}

// ==================== PARSING ====================

function parseGradients(src) {
  const grads = new Map();
  const re = /<linearGradient id="([^"]+)" x1="([\d.-]+)%" x2="([\d.-]+)%" y1="([\d.-]+)%" y2="([\d.-]+)%">([\s\S]*?)<\/linearGradient>/g;
  for (const g of src.matchAll(re)) {
    const stops = [...g[6].matchAll(/offset="([\d.]+)%" style="stop-color:(#[0-9a-f]{6});stop-opacity:([\d.]+)/gi)]
      .map((s) => ({ offset: +s[1], color: s[2].toLowerCase(), opacity: +s[3] }));
    // The trace's y axis points up, so flip the gradient's vertical direction.
    grads.set(g[1], { x1: +g[2], x2: +g[3], y1: 100 - +g[4], y2: 100 - +g[5], stops });
  }
  return grads;
}

/** The traced paths, in drawing order (the raster underlay comes first and is skipped). */
function parsePaths(src) {
  const start = src.indexOf("<image");
  if (start < 0) throw new Error("no raster underlay found: is this a Pixelmator Pro traced export?");
  const re = /<path d="([^"]*)" transform="scale\(1\.000000,1\.000000\) translate\(([-\d.]+),([-\d.]+)\)"([^>]*)>/g;
  re.lastIndex = start;
  const paths = [];
  for (const m of src.matchAll(re)) {
    if (m.index < start) continue;
    const grad = /fill="url\(#([^)]+)\)"/.exec(m[4]);
    const solid = /fill="(#[0-9a-f]{6})"/i.exec(m[4]);
    paths.push({ d: bakePath(m[1], +m[2], +m[3]), gradient: grad?.[1], fill: solid?.[1] ?? "#000000" });
  }
  return paths;
}

// ==================== BUILD ====================

function makeFills(scene, grads) {
  const defs = [];
  const shared = new Map();
  return {
    defs,
    fillFor(id) {
      const g = grads.get(id);
      if (!g) throw new Error(`missing gradient ${id}`);
      const opaque = g.stops.every((s) => s.opacity === 1);
      if (opaque && colorSpread(g.stops.map((s) => s.color)) <= FLAT_SPREAD) return g.stops[Math.floor(g.stops.length / 2)].color;
      const body = `x1="${round1(g.x1)}%" x2="${round1(g.x2)}%" y1="${round1(g.y1)}%" y2="${round1(g.y2)}%">` +
        g.stops.map((s) => `<stop offset="${round1(s.offset)}%" stop-color="${s.color}"${s.opacity === 1 ? "" : ` stop-opacity="${round1(s.opacity)}"`}/>`).join("");
      if (!shared.has(body)) {
        const gid = `${scene}-g${(shared.size + 1).toString(36)}`;
        shared.set(body, gid);
        defs.push(`<linearGradient id="${gid}" ${body}</linearGradient>`);
      }
      return `url(#${shared.get(body)})`;
    },
  };
}

function checkSpec(name, spec, pathCount) {
  if (spec.pathCount !== pathCount) {
    throw new Error(`${name}.svg has ${pathCount} paths but motion.json expects ${spec.pathCount}: ` +
      "a re-export renumbers the shapes, so the moving parts need re-mapping");
  }
  const owner = new Map();
  for (const g of spec.groups ?? []) {
    for (const i of expandMembers(g.paths)) {
      if (i >= pathCount) throw new Error(`${name}: group "${g.name}" names path ${i}, but there are only ${pathCount}`);
      if (owner.has(i)) throw new Error(`${name}: path ${i} is in both "${owner.get(i).name}" and "${g.name}"`);
      owner.set(i, g);
    }
  }
  return owner;
}

export function buildScene(name, src, spec) {
  const grads = parseGradients(src);
  const paths = parsePaths(src);
  const owner = checkSpec(name, spec, paths.length);
  const dropped = new Set(expandMembers(spec.drop ?? []));
  const fills = makeFills(name, grads);
  const groups = new Map((spec.groups ?? []).map((g) => [g.name, g]));

  // Clip paths for inserts, made of <use> copies of the traced shapes they cover.
  const clipped = new Set();
  const inserts = (spec.inserts ?? []).map((ins, k) => {
    if (ins.group && !groups.has(ins.group)) throw new Error(`${name}: insert names unknown group "${ins.group}"`);
    if (!ins.clip) return ins;
    const members = expandMembers(ins.clip);
    members.forEach((i) => clipped.add(i));
    const id = `${name}-c${k}`;
    fills.defs.push(`<clipPath id="${id}">${members.map((i) => `<use href="#${name}-p${i}"/>`).join("")}</clipPath>`);
    return { ...ins, svg: `<g clip-path="url(#${id})">${ins.svg}</g>` };
  });

  const items = [];
  const pushInserts = (after) => inserts.filter((ins) => ins.after === after)
    .forEach((ins) => items.push({ group: ins.group ? groups.get(ins.group) : undefined, html: ins.svg }));
  pushInserts(-1);
  paths.forEach((p, i) => {
    if (dropped.has(i)) { pushInserts(i); return; }
    const fill = p.gradient ? fills.fillFor(p.gradient) : p.fill;
    const id = clipped.has(i) ? ` id="${name}-p${i}"` : "";
    items.push({ group: owner.get(i), html: `<path${id} d="${p.d}" fill="${fill}"/>` });
    pushInserts(i);
  });

  const style = new Map();
  for (const g of groups.values()) {
    const ds = expandMembers(g.paths).map((i) => paths[i].d);
    style.set(g, motionStyle(g, pivot(g.origin, bbox(ds))));
  }
  let body = "";
  for (let k = 0; k < items.length; ) {
    const group = items[k].group;
    let run = "";
    while (k < items.length && items[k].group === group) run += items[k++].html;
    body += group ? `<g class="anim anim-${group.anim} vb" style="${style.get(group)}">${run}</g>` : run;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" class="illo-traced"><defs>${fills.defs.join("")}</defs>${body}</svg>`;
}

function moduleSource(name, label, svg) {
  return `// Generated by scripts/import-traced-art.mjs from art/home-illustrations/traced/${name}.svg.
// Don't edit — change the SVG (or traced/motion.json) and run \`npm run illustrations:traced\`.
import type { IlloArtData } from "../illo";

const art: IlloArtData = {
  label: ${JSON.stringify(label)},
  svg: ${JSON.stringify(svg)},
};

export default art;
`;
}

function run(names) {
  const motion = JSON.parse(fs.readFileSync(path.join(ART_DIR, "motion.json"), "utf8"));
  const scenes = names.length ? names : Object.keys(motion).filter((k) => !k.startsWith("_"));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const name of scenes) {
    const spec = motion[name];
    if (!spec) throw new Error(`traced/motion.json has no "${name}" section`);
    const src = fs.readFileSync(path.join(ART_DIR, `${name}.svg`), "utf8");
    const svg = buildScene(name, src, spec);
    fs.writeFileSync(path.join(OUT_DIR, `${name}.ts`), moduleSource(name, spec.label, svg));
    console.log(`✓ ${name} (${(svg.length / 1024).toFixed(0)} KB)`);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    run(process.argv.slice(2));
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
