# Home Page Illustrations — Artist's Guide

These are the drawings on the ParQwish Planner Home page: one for each trip phase, plus the skyline banner. They're first drafts. They're here so you can redraw and refine them, then hand them back.

You don't need to touch any code. Edit the `.svg` files, save them back here, and ask Claude to "import the illustrations". Claude runs one command that puts your drawings in the app, keeps the animation working, and checks nothing important was lost.

## What's in this folder

| File | What it is | Canvas |
|---|---|---|
| `plan.svg` | Writing a wish list, dreaming of rides | 300 × 400 |
| `preview.svg` | Marking the day's route on a wall map | 300 × 400 |
| `prepare.svg` | Packing a suitcase by the wardrobe | 300 × 400 |
| `play.svg` | Out in the park taking photos | 300 × 400 |
| `publish.svg` | Putting the trip recap together on a computer | 300 × 400 |
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
3. **Keep the canvas size.** Cards are 300 wide × 400 tall, and the banner is 1000 × 220. You can draw anything inside, but don't resize the canvas.

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
| plan | `writing-arm` | wiggles like it's writing (pivots at its top-left corner) |
| plan | `list-line-…` | each line draws itself in |
| plan | `list-star-…` | each star pops in |
| plan | `bubble` | the thought bubble pops up |
| plan | `wish-…` | each dream (rocket, wheel, cone) pops in |
| plan | `starburst` | pops at the end |
| preview | `route` | draws itself across the map |
| preview | `pin-…` | each pin drops in |
| preview | `cell-…` | each calendar square pops in |
| preview | `pointer-arm` | taps the map (pivots at its bottom-left corner) |
| preview | `starburst` | pops at the end |
| prepare | `packing-arm` | lowers the folded shirt (pivots at its top-left corner) |
| prepare | `packed-…` | each item drops into the suitcase |
| prepare | `luggage-tag` | swings (pivots at its top-left corner) |
| prepare | `starburst` | pops at the end |
| play | `character` | bounces as they walk |
| play | `flash` | the camera flash |
| play | `photo-…` | each snapshot pops out |
| play | `balloon` | floats up |
| play | `ferris-wheel` | turns slowly |
| publish | `typing-arm` | taps the keyboard (pivots at its top-left corner) |
| publish | `screen-photo-…` | each photo pops onto the screen |
| publish | `bar-…` | each chart bar grows up from the bottom |
| publish | `trail` | the map trail draws itself |
| publish | `starburst` | pops at the end |
| banner | `monorail-train` | glides in along the track from the left |
| banner | `sparkle-…` | each sparkle pops in |
| banner | `coaster-car` | teeters at the top of the first hill (pivots at its bottom middle) |
| banner | `burst-…` | each firework bursts and fades, over and over (inside `fireworks`) |
| banner | `stars`, `fireworks` | only visible in night mode |

### Tips for the moving parts

- **Arms pivot at a corner of their own box.** If you redraw an arm, keep the shoulder in the corner the table says. Otherwise it will swing from the wrong place. If a new pose needs a different pivot, just tell Claude.
- **Lines that "draw themselves"** (the route, list lines, trail) need to stay *strokes*, not filled shapes. In Figma, don't use *Outline stroke* on them.
- **Things that pop or drop** can be any shape. They grow from their middle, or fall from just above where they end up.
- **Order matters for stacking.** Layers lower in the list are drawn on top. For example, the suitcase front (`base`) sits above the packed items so they look like they're inside.

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

## For Claude: importing

```bash
npm run illustrations            # every scene
npm run illustrations -- plan    # one scene
```

This writes `src/components/home/illustrations/generated/*.ts`. The motion itself is the `.illo-*` CSS in `src/app/globals.css`, and `motion.json` maps layer names to animations. Missing layer names fail the import. Off-palette colors only warn.
