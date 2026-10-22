# Architecture

PosePop is a static, client-only web app. There is no server and no API: GitHub Pages serves files, and everything else (people detection, cut-out, block conversion, 3D rendering, print layout) runs in the visitor's browser.

## Repository layout

```
src/
  index.html          the whole app: markup, styles, and one inline script
  favicon.svg
  thumbs/             world picker thumbnails (JPEG)
  models/             TF.js graph models (JSON topology + binary .bin weights)
scripts/
  build.mjs           src/ + node_modules → dist/ (hashed names, SRI, CSP, build id)
  verify.mjs          release gate for dist/
  serve.mjs           local preview with production-like caching
.github/workflows/pages.yml   CI: build + verify on PRs, deploy on main
docs/                 this file, ROADMAP.md, DEVICE-TEST.md (real-device and test-print script)
```

## Runtime pipeline

```
photo ──► decodeFile ──► findPeople ──► segment ──► work() zoom ──► convert ──► personMask ──► buildView ──► compose ──► print / sheet
          (≤2200 px,     (MoveNet       (Selfie        (crop to      (blocks +     (layers,      (trim,        (world + people
           EXIF-aware)    MultiPose:     Segmentation   people)       dither)       strokes)      border)       + shadow, edits)
                          full, padded,  per person,
                          windows; NMS   head pass)
                          by shoulders)
```

| Stage | Function(s) | Notes |
|---|---|---|
| Load | `loadFile`, `decodeFile` | `createImageBitmap` with orientation, `<img>` fallback, downscale to 2200 px for mobile memory |
| Find people | `findPeople`, `detectIn` | Full frame, padded frame (edge people), overlapping windows for wide/tall photos; duplicates merged by head/shoulder position; crowd filter at 35 % of tallest person |
| Cut out | `segment`, `selfieMask` | Square crop per person + tighter head-and-shoulders pass, clipped to the person's box; tiled fallback when nobody is found |
| Zoom | `work` | Crops source + alpha to the union of people boxes |
| Blocks | `convert`, `nearest` | CIELAB nearest-colour with a 64³ cache, optional Floyd–Steinberg dithering |
| Mask | `personMask`, `effBoxes` | Threshold, speck removal, hole fill, one layer per person, then user strokes in order. Layers come from the detector boxes (nearest box wins). Once the user adjusts a box (`S.edges`), boxes become claims: an adjusted box owns everything inside it, untouched boxes share the rest, and blocks outside every box are cropped |
| View | `buildView` | Trims to the people, adds the white cut border for cut-out stickers |
| Compose | `compose`, `drawBoxes` | 3D world from `renderScene`, placement, shadow, bevel, selection handles. Placement is each person's own (`S.place[L]`) followed by the group's (`S.gplace`, scaled around everyone's bottom centre), folded into one `{dx,dy,s}` by `pl(L)`. In Adjust boxes mode the preview ignores placement and tints each person in their box colour |
| Worlds | `makeWorld`, `buildScene`, `renderScene` | Seeded voxel worlds; instanced meshes per block type; columns culled to the camera's view; renders cached by size |
| Print | `frameSize`, `layoutFor`, `sizeForCount`, `renderSheet` | 300 dpi, StickerPix sheet 3.94 × 7.68 in, PNG tagged with pHYs |
| Update | `checkForUpdate` | See "Caching" in the README |
| Diagnostics | `mark`, `timed`, `drawDiag` | Stages record timings and facts with `mark(section, key, value)`; the panel only renders with `?debug=1`. No CSP change: the panel is plain DOM built with `textContent`, styled by the hashed inline `<style>`. Nothing is sent anywhere, and the copied report leaves out file names |

State lives in one object, `S`. Undo/redo snapshots `S.fixes`, `S.place`, `S.gplace`, `S.edges` and `S.sel` as JSON. `S.moveMode` (`group` by default, `each`, `boxes`) decides what move, resize, pinch, scroll and the Size slider act on, through `cur()`.

## Build and delivery

- `__ASSET:<path>__` and `__SRI:<path>__` placeholders in `src/index.html` are replaced with content-hashed file names and SHA-384 hashes.
- The build id is `<commit>-<content hash>`. The hash part changes only when shipped content changes, but the commit part changes on every commit to `main`, docs-only ones included, so every merge counts as an update for open pages. The build time (`__BUILT_AT__`) is filled in after hashing and also goes into `version.json`; `verify.mjs` checks that both agree.
- The footer shows the version (commit), build time and the result of the last update check (up to date, update ready, offline, or couldn't check). The full build id is in its tooltip and in the `?debug=1` panel.
- Loading order: three.js and tf.js are preloaded from `<head>`, and the model files start downloading as soon as the script runs (`earlyModels`), with SRI. tf.js picks those responses up instead of fetching again, so the 9 MB of weights overlap tf.js loading and starting up. First load is now limited by download size.
- CSP hashes are computed from the final inline `<script>` and `<style>`, so any edit to them is automatically reflected and verified.
- Models: each `.bin` is hashed first, then its JSON is rewritten to name the hashed `.bin`, so the JSON's hash also pins its weights. The page loads them with `tf.loadGraphModel(url)` and a `fetchFunc` that attaches each file's SRI hash from `MODEL_SRI`; a file without a known hash, or one that doesn't match, is refused. `verify.mjs` checks the JSON → `.bin` link and that both have SRI entries.

## Refactor notes

These are the known structural debts, roughly in the order they should be paid down. Each has a matching item in [ROADMAP.md](ROADMAP.md).

1. **Split `src/index.html` into ES modules.** It's about 1,300 lines in a single inline script. Suggested modules: `textures`, `worlds`, `render3d`, `detect`, `segment`, `blocks`, `compose`, `edit`, `print`, `update`, `ui`. Serve them as hashed `type="module"` files; the CSP already permits `'self'` scripts, so no CSP loosening is needed. Keep it build-step-light (native modules plus the existing hashing), or adopt Vite if the team prefers. In both cases `verify.mjs` stays the gate.
2. ~~**Store model weights as binary.**~~ Done. Measured: model files 13.2 MB → 9.97 MB on disk, but over the wire only 9.50 MB → 9.00 MB gzipped (Pages already gzipped the base64), so the expected 25 % download saving didn't materialise. Load is faster with no base64 decode (people model 1,134 → 1,001 ms, cut-out model 482 → 320 ms at 6× CPU throttle), the page no longer builds a 12.6 MB string, and model files are now integrity-checked.
3. **Move detection and segmentation into a Web Worker.** TF.js on the main thread freezes the UI for a few seconds on phones. Use `OffscreenCanvas` and the WebGL backend in the worker, which needs `worker-src 'self'` (already allowed; `blob:` workers are not, and `verify.mjs` rejects `blob:`/`data:` outside `img-src`).
4. **Generate world thumbnails at build time.** Half done: the thumbnails are now hashed JPEGs in `src/thumbs/` (35 KB in total, cached between deploys) instead of base64 in the HTML, which took `index.html` from 73 KB to 42 KB gzipped and let `img-src` drop `data:`. Still open: render them in CI with Playwright from the same world code, so they can't drift from the worlds.
5. **Remove Claude-artifact code paths.** `window.claude.use("downloads")` in the save code is dead on Pages. Remove it so saving has a single path: the standard download.
6. **Name the magic numbers.** Thresholds (alpha 0.42, crowd 0.35, merge 0.55 × shoulder width, flood 26 ΔE), sheet geometry and timing constants should become named constants in one place, with comments on how they were tuned.
7. **Make the style layer pluggable.** "Blocks" is currently hard-wired, from the palette and textures to `convert`. Introduce a `Style` interface (`palette`, `toCells`, `drawCell`) so future looks such as 8-bit, mosaic or comic plug in without touching detection or print.
8. **Tests around pure functions.** `sizeForCount`, `layoutFor`, `personMask` (strokes and flood), the NMS in `findPeople` and colour matching are pure or nearly so. Pull them into modules and unit-test them with `node --test`.
