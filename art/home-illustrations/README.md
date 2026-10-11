# Home Page Illustrations — Artist's Guide

These are the drawings on the ParQwish Planner Home page: one card for each trip phase, plus the skyline banner.

- **The five cards** (Plan, Preview, Prepare, Play, Publish) are traced artwork in `traced/`. See [Traced card art](#traced-card-art).
- **The banner** is drawn by hand in `banner.svg`. The rest of this guide is about it.

You don't need to touch any code. Edit the `.svg` files, save them back here, and ask Claude to "import the illustrations". Claude runs one command that puts your drawings in the app, keeps the animation working, and checks nothing important was lost.

## What's in this folder

| File | What it is | Canvas |
|---|---|---|
| `traced/*.svg` | The five Home cards (traced, from Pixelmator Pro) | 1500 × 2000 |
| `traced/motion.json` | Which traced shapes move, and how. Claude looks after this one. | |
| `banner.svg` | The skyline behind the logo | 1000 × 220 |
| `palette.gpl` | The color palette, for Inkscape | |
| `palette.svg` | The same colors as swatches, for Figma | |
| `motion.json` | Which layers move, and how. Claude looks after this one. | |

## Pick a tool

Both of these are free and save SVG files.

- **Figma** (recommended to start): works in a web browser, or as a Mac app, at figma.com. The free Starter plan is plenty. It's the easiest to learn, with lots of beginner videos. Search YouTube for "Figma for beginners".
- **Inkscape**: a free Mac app from inkscape.org. SVG is its own file format, so nothing gets converted on the way in or out. It's more old-fashioned to learn, but very capable.
- **Pixelmator Pro** (Apple, part of Apple Creator Studio): tested with version 4.4. It keeps the layer names and the line strokes, so it works with the import as-is.

If you're unsure, start with Figma. Switching later is fine, because all three open and save the same files.

## The three rules

1. **Keep the names of the moving parts.** Every shape and group has a layer name. The parts listed under [What moves](#what-moves) are found by name, so if you rename or delete one the animation can't find it. The import will tell you exactly which name went missing. Everything else you can rename, regroup, redraw or delete freely.
2. **Use the palette colors.** The app swaps each palette color for its night-mode version automatically. Any other color stays the same at night, so it may look wrong on the dark background. The import warns you about any color that isn't in the palette.
3. **Keep the canvas size.** The banner is 1000 × 220 (traced cards are 1500 × 2000, a 3 : 4 card). You can draw anything inside, but don't resize the canvas.

## Opening a drawing

**Figma**
1. Create a new Design file.
2. Drag the `.svg` file onto the canvas, or use the menu: *File → Place image*.
3. It appears as a frame named after the file, with all its layers listed on the left.
4. To load the palette, also drag in `palette.svg` and use the eyedropper (press **I**) to pick colors from its swatches.

**Inkscape**
1. *File → Open* the `.svg` file.
2. Open *Layer → Layers and Objects* to see the layer names.
3. To load the palette, copy `palette.gpl` into Inkscape's palettes folder (*Edit → Preferences → System → User palettes*, then *Open*), restart Inkscape, and pick "ParQwish Illustrations" from the palette menu at the bottom of the window.

**Pixelmator Pro**
1. *File → Open* the `.svg` file. Each shape and group shows in the Layers sidebar with its name.
2. For colors, open `palette.svg` too and pick from its swatches with the color picker's eyedropper. Or type a hex code from the [Colors](#colors) table into the color picker.

## Saving it back

**Figma**
1. Click the frame's name, just above the canvas, so the whole drawing is selected.
2. In the right-hand panel, under **Export**, click **+**, then choose **SVG**.
3. Click the **⋯** next to it and turn on **Include "id" attribute**. This is what keeps the layer names.
4. Click **Export**, and save over the original file in this folder with the same name.

**Inkscape**
1. *File → Save As…*
2. Choose **Plain SVG** as the format, and save over the original file with the same name.

**Pixelmator Pro**
1. *File → Export…* and choose **SVG**.
2. Save over the original file in this folder with the same name. Or save it somewhere else, like your Desktop, and ask Claude to do a trial import first.

Then tell Claude "I've updated plan.svg" (or whichever), and it'll import it and show you the result.

## What moves

Each moving part must keep its layer name. A name ending in `-` (like `pin-`) means every layer whose name starts that way (`pin-1`, `pin-2`…). They animate in order, so you can add a `pin-4` and it will join in.

| Scene | Layer name | What it does |
|---|---|---|
| banner | `monorail-train` | glides in along the track from the left |
| banner | `sparkle-…` | each sparkle pops in |
| banner | `coaster-car` | teeters at the top of the first hill (pivots at its bottom middle) |
| banner | `burst-…` | each firework bursts and fades, over and over (inside `fireworks`) |
| banner | `stars`, `fireworks` | only visible in night mode |

### Tips for the moving parts

- **Parts that tilt pivot at a point the table says** (the coaster car rocks on its bottom middle). If you redraw one, keep that point in place, or tell Claude the new pivot.
- **Lines that "draw themselves"** (none in the banner today) need to stay *strokes*, not filled shapes. In Figma, don't use *Outline stroke* on them.
- **Things that pop or drop** can be any shape. They grow from their middle, or fall from just above where they end up.
- **Order matters for stacking.** Layers lower in the list are drawn on top. For example, the train sits above the track so it looks like it's riding on it.

## Colors

| Name | Hex | Used for |
|---|---|---|
| sky | `#BFE3DD` | sky, windows |
| sky-2 | `#E9D3A3` | the banner's horizon glow |
| wall | `#F1E6CF` | room walls |
| floor | `#D8C29C` | floors, ground, walkways |
| paper | `#FFF9EC` | paper, maps, the computer case |
| ink | `#2B2D42` | outlines, hair, legs |
| teal | `#2F9C95` | the main character's clothes, leaves |
| orange | `#E07A3F` | desks, lids, accents |
| mustard | `#E3A93A` | starbursts, stars, highlights |
| coral | `#D9573F` | pins, pots, suitcases |
| sage | `#7FA97C` | hills, grass, the wardrobe |
| skin | `#EFC29C` | faces and hands |
| orb | `#F4B942` | the sun (it becomes the moon at night) |
| star | `#FFFFFF` | night stars (hidden in day mode) |

Want a new color? Ask Claude to add it to the palette, with a night-mode partner, before you use it.

## Keeping it Disney-safe

Keep the look — flat shapes, starbursts, 1950s "tomorrow" style — but not the content: no Disney characters, no castle, and no recognizable real attractions. A generic rocket or Ferris wheel is fine; a Matterhorn or Space Mountain is not.

## Traced card art

The five cards are traced pictures: Pixelmator Pro turns an image into a few hundred flat shapes. Those shapes have no layer names, so the moving parts are picked by **shape number** in `traced/motion.json`, not by name.

What that means for you:

- **Re-exporting renumbers every shape.** If you change a card and export it again, save it over the file in `traced/` and ask Claude to "re-map the traced art for plan" (or whichever). The import refuses to run until that's done, so nothing breaks silently.
- **Moving parts leave holes.** Traced art doesn't stack shapes. Where a part sits, the picture behind it has a hole. So each moving part has a "patch" in `motion.json`, a plain shape in the background colour that fills the hole while the part is hidden or moving.
- **Night mode just dims them.** The traced colours aren't in the palette below, so the cards are darkened slightly at night instead of being recoloured.
- **Fixes made on import.** The Preview card's heading is retyped as "Wish List" (the trace read "Wish Lit"), and the Apple logos on the Preview and Publish computers are removed. If you fix these in the art itself, tell Claude so the import's fixes can come out.

| Card | What moves |
|---|---|
| plan | the hands type; the thought bubbles and cloud pop up; the rides appear one by one; the wish list's dots and lines fill in |
| preview | the route draws itself stop by stop over a faint outline; the wish list's dots tick green |
| prepare | the hanging shirts sway; the clothes drop into the suitcase |
| play | the cloud drifts in; both cameras flash |
| publish | "Our Day" pops up, then the ten photos, one by one |

## For Claude: importing

```bash
npm run illustrations            # every scene
npm run illustrations -- plan    # one scene
```

This writes `src/components/home/illustrations/generated/banner.ts`. The cards use their own importer:

```bash
npm run illustrations:traced            # every card
npm run illustrations:traced -- plan    # one card
```

It writes `generated/<card>.ts`, which the Home page loads on its own (each is 140–250 KB). To re-map a card after a re-export: list each path's bounding box and colour, render the card with the candidate paths highlighted, and update `pathCount`, `groups` and the patch `inserts` in `traced/motion.json`. Check a frame with every moving part hidden, so no white holes show. The motion itself is the `.illo-*` CSS in `src/app/globals.css`, and `motion.json` maps layer names to animations. Missing layer names fail the import. Off-palette colors only warn.
