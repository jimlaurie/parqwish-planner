// ==================== IMPORT ILLUSTRATIONS ====================
// Turns the editable Home-page art in art/home-illustrations/*.svg into the
// markup the app renders (src/components/home/illustrations/generated/*.ts):
//   - layers are matched by name: the id, or Inkscape's layer label, tidied
//     up (lowercase, dashes) — the ids themselves are left alone so clip
//     paths and other internal references keep working
//   - palette colors become var(--illo-*) so day/night theming works
//   - layers listed in motion.json get wrapped in a <g> carrying the
//     animation class and timing, so an editor's own transforms can't clash
//   - ids are prefixed per scene so five inline SVGs can share one page
// Fails loudly if motion.json names a layer the SVG no longer has.
//
// Usage: npm run illustrations            (every scene)
//        npm run illustrations -- plan    (just one)

import fs from "node:fs";
import path from "node:path";
import { optimize } from "svgo";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ART_DIR = path.join(ROOT, "art/home-illustrations");
const OUT_DIR = path.join(ROOT, "src/components/home/illustrations/generated");

// Day-mode palette hex → theme token. Night values live in globals.css.
const PALETTE = {
  "#BFE3DD": "sky", "#E9D3A3": "sky-2", "#F1E6CF": "wall", "#D8C29C": "floor",
  "#FFF9EC": "paper", "#2B2D42": "ink", "#2F9C95": "teal", "#E07A3F": "orange",
  "#E3A93A": "mustard", "#D9573F": "coral", "#7FA97C": "sage", "#EFC29C": "skin",
  "#F4B942": "orb", "#FFFFFF": "star",
};
const NAMED = { white: "#FFFFFF", black: "#000000" };
const COLOR_PROPS = ["fill", "stroke", "stop-color"];
const SHAPES = new Set(["path", "line", "polyline", "polygon", "circle", "ellipse", "rect"]);

// ==================== PURE HELPERS ====================

export function layerName(raw) {
  return String(raw).trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function normalizeHex(value) {
  const v = NAMED[value.toLowerCase()] ?? value;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  const hex = short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : v;
  return hex.toUpperCase();
}

/** var(--illo-x) for a palette color, or null (and the caller warns). */
export function themeColor(value) {
  if (!value || value === "none" || value.startsWith("url(") || value.startsWith("var(")) return value;
  const token = PALETTE[normalizeHex(value)];
  return token ? `var(--illo-${token})` : null;
}

/** Expands motion.json entries (by name, or by name prefix + stagger) against the SVG's layer order. */
export function expandMotion(entries, orderedNames) {
  const targets = new Map();
  for (const entry of entries) {
    const ids = entry.match ? orderedNames.filter((name) => name.startsWith(entry.match)) : [entry.id];
    if (ids.length === 0) throw new Error(`motion.json: no layer name starts with "${entry.match}"`);
    ids.forEach((id, i) => targets.set(id, { ...entry, delay: (entry.delay ?? 0) + i * (entry.stagger ?? 0) }));
  }
  return targets;
}

export function motionStyle(t) {
  const vars = [`--d:${t.delay ?? 0}s`, `--t:${t.duration ?? 0.6}s`];
  if (t.repeat) vars.push(`--n:${t.repeat}`);
  if (t.rotate !== undefined) vars.push(`--r:${t.rotate}deg`);
  if (t.origin) {
    const [ox, oy] = t.origin.split(/\s+/);
    vars.push(`--ox:${ox}`, `--oy:${oy}`);
  }
  return vars.join(";");
}

function appendStyle(node, css) {
  const existing = node.attributes.style ? node.attributes.style.replace(/;?\s*$/, ";") : "";
  node.attributes.style = existing + css;
}

// ==================== SVGO PLUGINS ====================

/** Pass 1: tag each named layer with its tidied name, and record names in drawing order. */
function namesPlugin(orderedNames) {
  return {
    name: "parqwish-layer-names",
    fn: () => ({
      element: {
        enter(node) {
          const raw = node.attributes["inkscape:label"] ?? node.attributes["data-name"] ?? node.attributes.id;
          if (raw === undefined) return;
          node.attributes["data-layer"] = layerName(raw);
          orderedNames.push(node.attributes["data-layer"]);
        },
      },
    }),
  };
}

/**
 * A single straight segment ("M x y L x y") has no area, so its fill never
 * shows — but Pixelmator Pro writes fill="#000000" on every stroked line,
 * which would otherwise warn as an off-palette color on each import.
 */
export function isBareLine(node) {
  if (node.name === "line") return true;
  return node.name === "path" && /^\s*M[\d.\s,-]+L[\d.\s,-]+$/i.test(node.attributes.d ?? "");
}

/** Pass 2: palette colors → theme tokens (as style, since attributes can't hold var()). */
function colorsPlugin(unknown) {
  const convert = (value) => {
    const themed = themeColor(value.trim());
    if (themed === null) unknown.add(value.trim());
    return themed ?? value;
  };
  return {
    name: "parqwish-theme-colors",
    fn: () => ({
      element: {
        enter(node) {
          if (isBareLine(node) && node.attributes.fill !== undefined) node.attributes.fill = "none";
          for (const prop of COLOR_PROPS) {
            const value = node.attributes[prop];
            if (value === undefined) continue;
            delete node.attributes[prop];
            appendStyle(node, `${prop}:${convert(value)}`);
          }
          if (node.attributes.style) {
            node.attributes.style = node.attributes.style.replace(
              /(fill|stroke|stop-color)\s*:\s*([^;]+)/g, (_, prop, value) => `${prop}:${convert(value)}`);
          }
        },
      },
    }),
  };
}

function markDrawable(node) {
  if (SHAPES.has(node.name)) node.attributes.pathLength = "1";
  for (const child of node.children ?? []) if (child.type === "element") markDrawable(child);
}

/** Pass 2: wrap animated / night-only layers in a <g> that carries the motion. */
function motionPlugin(targets, nightOnly, found) {
  const pending = [];
  return {
    name: "parqwish-motion",
    fn: () => ({
      element: {
        enter(node, parent) {
          const layer = node.attributes["data-layer"];
          delete node.attributes["data-layer"];
          if (targets.has(layer) || nightOnly.has(layer)) pending.push({ node, parent, layer });
        },
      },
      root: { exit: () => pending.forEach(({ node, parent, layer }) => wrap(node, parent, layer, targets, found)) },
    }),
  };
}

function wrap(node, parent, layer, targets, found) {
  found.add(layer);
  const target = targets.get(layer);
  const attributes = target
    ? { class: `anim anim-${target.anim}`, style: motionStyle(target) }
    : { style: "opacity:var(--illo-star-opacity)" };
  if (target?.anim === "draw") markDrawable(node);
  const wrapper = { type: "element", name: "g", attributes, children: [node] };
  parent.children[parent.children.indexOf(node)] = wrapper;
}

function rootPlugin(align) {
  return {
    name: "parqwish-root",
    fn: () => ({
      element: {
        enter(node, parent) {
          if (node.name !== "svg" || parent.type !== "root") return;
          delete node.attributes.width;
          delete node.attributes.height;
          Object.assign(node.attributes, { preserveAspectRatio: align, "aria-hidden": "true", focusable: "false" });
        },
      },
    }),
  };
}

// ==================== PIPELINE ====================

const CLEANUP = ["removeDoctype", "removeXMLProcInst", "removeComments", "removeMetadata", "removeTitle", "removeDesc", "removeEditorsNSData"];

export function importScene(name, rawSvg, config) {
  const orderedNames = [];
  const named = optimize(rawSvg, { plugins: [namesPlugin(orderedNames), ...CLEANUP] }).data;
  const targets = expandMotion(config.motion ?? [], orderedNames);
  const nightOnly = new Set(config.nightOnly ?? []);
  const unknown = new Set();
  const found = new Set();
  const svg = optimize(named, {
    plugins: [
      colorsPlugin(unknown),
      motionPlugin(targets, nightOnly, found),
      rootPlugin(config.align ?? "xMidYMid slice"),
      { name: "cleanupNumericValues", params: { floatPrecision: 2 } },
      { name: "prefixIds", params: { prefix: name, delim: "-", prefixClassNames: false } },
    ],
  }).data;
  const missing = [...targets.keys(), ...nightOnly].filter((id) => !found.has(id));
  return { svg, missing, unknown: [...unknown] };
}

function moduleSource(name, label, svg) {
  return `// Generated by scripts/import-illustrations.mjs from art/home-illustrations/${name}.svg.
// Don't edit — change the SVG (or motion.json) and run \`npm run illustrations\`.
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
  let failed = false;
  for (const name of scenes) {
    const config = motion[name];
    if (!config) throw new Error(`motion.json has no "${name}" section`);
    const raw = fs.readFileSync(path.join(ART_DIR, `${name}.svg`), "utf8");
    const { svg, missing, unknown } = importScene(name, raw, config);
    if (missing.length) {
      console.error(`✗ ${name}: these layers are in motion.json but not in ${name}.svg: ${missing.join(", ")}`);
      failed = true;
      continue;
    }
    if (unknown.length) console.warn(`! ${name}: colors outside the palette won't change at night: ${unknown.join(", ")}`);
    fs.writeFileSync(path.join(OUT_DIR, `${name}.ts`), moduleSource(name, config.label, svg));
    console.log(`✓ ${name} (${(svg.length / 1024).toFixed(1)} KB)`);
  }
  if (failed) process.exit(1);
}

if (process.argv[1] === new URL(import.meta.url).pathname) run(process.argv.slice(2));
