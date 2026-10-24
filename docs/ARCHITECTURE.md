# Architecture

PosePop is a static, client-only web app. There is no server and no API: GitHub Pages serves files, and everything else (people detection, cut-out, block conversion, 3D rendering, print layout) runs in the visitor's browser.

## Repository layout

```
src/
  index.html          the whole app: markup, styles, and one inline script
  favicon.svg
  thumbs/             world picker thumbnails (JPEG)
  sw.js               service worker template (offline cache per build)
  detect.js           person detection and cut-out (worker or page)
  detect-worker.js    Web Worker that runs detect.js
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
| Find people | `findPeople`, `detectIn` (`src/detect.js`) | Full frame, padded frame (edge people), overlapping windows for wide/tall photos; duplicates merged by head/shoulder position; crowd filter at 35 % of tallest person |
| Cut out | `segment`, `selfieMask` (`src/detect.js`) | Square crop per person + tighter head-and-shoulders pass, clipped to the person's box; tiled fallback when nobody is found |
| Zoom | `work` | Crops source + alpha to the union of people boxes |
| Style | `convert`, `nearest`, `STYLES` | CIELAB nearest-colour with a 64³ cache. The current style (`S.style`) supplies the palette, `toCells` (its dithering) and `drawCell`; see "Styles" below. |
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

## Detection worker

Detection and cut-out live in `src/detect.js`. The page normally runs it in a Web Worker (`src/detect-worker.js`), so the page keeps drawing and reacting while people are found, and tf.js never loads on the page.

- **Start-up:** the page creates the worker and sends it the hashed URLs of tf.js, `detect.js` and the models. The worker checks for OffscreenCanvas 2D, loads `detect.js`, starts the model downloads (with SRI), then loads tf.js and the models. `detect-worker.js` must stay at the site root, next to `index.html`, so those relative URLs resolve the same way in both places.
- **Per photo:** the page posts the photo as a transferred `ImageBitmap`. The worker posts `progress` labels ("Finding people (pass 2 of 4)…", "Cutting out person 3 of 6…") for the busy badge, then the mask as a transferred `ImageBitmap`. A newer photo cancels the running one at its next step. The page ignores results for photos that have since been replaced.
- **Falls back to the page** when there's no `Worker` or OffscreenCanvas, when the worker fails to start, or when the worker has no WebGL but the page does. Safari before 17 is the known case: tf.js on the CPU in a worker is about 10× slower than WebGL on the page, and a short freeze beats a long wait. `?worker=0` forces the page path for testing. `?debug=1` shows which path ran ("Detection → runs in").
- **Security:** no CSP change. `new Worker()` on a same-origin hashed file is allowed by `worker-src 'self'`, and the models are still fetched with SRI inside the worker. Browsers offer no integrity check for `new Worker()` or `importScripts()`, so the worker script and tf.js inside it aren't SRI-checked (see SECURITY.md).
## Kiosk mode (`?kiosk=1`)

A guest view for events. Add `?kiosk=1` to the URL; it survives update reloads, because `?v=` is added to the existing query.

| Part | Behaviour |
|---|---|
| Start screen | "Tap to start". The tap enters full screen (Fullscreen API; iPhone Safari has none, iPad does) and turns on Screen Wake Lock, which both need a user gesture. |
| Camera | A live preview (`getUserMedia`, front camera first, mirrored preview, **Switch camera**) with a big shutter, a 3-2-1 countdown and a flash. The saved photo isn't mirrored. The stream stops as soon as the photo is taken or the screen is left. If the camera is denied or unavailable, **Take photo** opens the normal phone camera input instead. |
| Guest view | The picture, the world picker, and a bottom bar with **Retake** and **Save** (≥ 56 px targets; 48 px on screens under 520 px tall). Landscape puts the worlds beside the picture; portrait puts them below. Everything marked `op` is hidden, including the update bar. |
| Reset | 60 s after any save, it returns to the start screen. Any tap restarts the 60 s. The reset cancels any running detection, replaces the guest's photo with the built-in sample, clears edits, sets the tool back to Move, and runs the update check: with nobody's work open, a waiting update applies straight away. |
| Settings | Long-press any PosePop title for 1.5 s to show or hide the operator view (`.unlocked`), which also has **Exit kiosk**. |

**Permissions:** the live camera triggers the browser's camera prompt once per device. There's no CSP change: a `MediaStream` isn't a URL fetch, and `Permissions-Policy` allows the camera for our own origin by default. Wake Lock shows no prompt.

**Limits:** a web page can't stop a guest leaving the browser, opening another tab, or long-pressing the title. For real lock-down, use the OS: **Guided Access** on iOS/iPadOS, **App pinning** on Android. Saved PNGs stay in the device's downloads for the operator to print; they aren't cleared by the reset.
## Styles

A style decides what the people are made of. Detection, masks, editing, worlds and print never look at which style is on. They see only palette indices in `S.result.grid` and call the style to draw them. Styles live in `STYLES` in `src/index.html`:

| Field | Purpose |
|---|---|
| `palette` | Entries `{name, avg:[r,g,b], lab, canvas, group}`. `canvas` is a 16×16 icon for the materials list. |
| `groups`, `on` | The palette chips and which are on by default. At least one stays on. |
| `toCells(pixels, w, h, dither, nearest)` | Photo pixels (RGBA) → `Int16Array` of palette indices. `nearest` is the shared CIELAB matcher, limited to the groups that are on. |
| `drawCell(ctx, i, x, y, w, h, bevel, t)` | Draws one cell. |
| `textured` | Offers "3D block edges" and the small-cell print warning. |
| `unit`, `units`, `kinds`, `title`, `paletteLabel`, `listName`, `amount(n)`, `csv(list)` | The words and counts in the controls, the materials list and the CSV. |

| Style | Palette | `toCells` | `drawCell` |
|---|---|---|---|
| Blocks | 83 textured blocks in 4 groups | Floyd–Steinberg error diffusion | 16×16 texture plus optional bevel |
| Retro pixel | DawnBringer 16 (free to use), or 4 handheld greens | 4×4 ordered (Bayer) dithering, for the checkerboard look of old consoles | Flat colour |

**Look** (`S.look`, People panel) applies to every style:

- **Clean** (default): a gentle contrast (`LOOK_STRETCH`) and saturation (`LOOK_SAT`) lift taken from the people's own 2nd–98th brightness percentiles. Then `LOOK_K` k-means clusters of the people's colours, each snapped to the closest block with a cost for grainy textures (`LOOK_SMOOTH`, using each block's `busy`). Colours further than `LOOK_KEEP` ΔE from every cluster, on at least `LOOK_KEEP_N` cells, keep their own block, which is what preserves eyes and mouths. Cells are then matched to that short palette. Dithering is off by default.
- **Detailed:** the full palette with dithering, byte-for-byte the previous behaviour.
- **Tried and dropped:** an edge-preserving (Kuwahara) smoothing pass erased eyes and mouths at normal detail. Shrinking the photo to cell size already averages away sensor noise.
- **Measuring:** `?debug=1` shows **Photo → busyness**, the share of neighbouring person cells that differ. `?sample=photo` gives the built-in demo uneven light, sensor noise and softness, always identically. On it, at 64 blocks wide, Detailed scores 69% with 43 block types and Clean 11% with 16.

To add a style, add an entry to `STYLES`. The picker above the worlds lists every entry, and every label that names the cells follows the style. New art (for example an emoji set) must be self-hosted from a pinned package under an open licence and listed in `THIRD_PARTY_NOTICES.md`. Names stay generic: no game, toy or brand names.

## Offline (service worker)

`src/sw.js` is filled in by the build and published as `dist/sw.js`, under a fixed name, because browsers recheck the service worker at that URL for changes. Each build's worker has a different build id, so every deploy installs a new worker.

| Request | Behaviour |
|---|---|
| The page (`./`, `./index.html`, any query such as `?v=` or `?debug=1`) | **Network first.** The cached copy is used only when the network request fails (offline), never because it's slow, so a new deploy is never hidden behind a stale page. |
| Hashed assets in the build manifest | **Cache first.** Their names change with their content, so a cached copy can't be stale. A miss falls through to the network. |
| `version.json` and anything else | Not handled. The update check always reaches the server; `verify.mjs` fails the build if `sw.js` mentions `version.json`. |

- **Install:** fetches this build's `index.html` (`?sw=<build>`, `no-store`) and refuses to install unless it contains this build's id. That guards against a CDN edge still serving the previous page after a deploy. It then stores every hashed asset through a request carrying its SRI hash, so only verified bytes are cached. It calls `skipWaiting()`.
- **Activate:** deletes every other `posepop-*` cache and takes control of open pages. A page that is still open on the old build already has all its files loaded, because everything is fetched at start-up.
- **Registration:** happens only after the models have loaded. That way install copies files from the browser's HTTP cache instead of downloading them again, and it doesn't compete with first load. In testing, registering earlier made the page's own 9 MB model download fail (`ERR_CACHE_WRITE_FAILURE`), because the HTTP cache allows one writer per file.
- **Updates:** unchanged. The page still compares `version.json` with its own build and moves to `?v=<build>`, or shows the update bar mid-edit. With the page network-first, that navigation always gets the new HTML, and the new worker installs alongside.
- **Status:** the footer adds "works offline" once this build's cache is complete (the people model, the largest file, is present), and `?debug=1` shows it under Build → offline.
- **CSP:** none needed beyond the existing `worker-src 'self'`. The worker script isn't covered by the page's `<meta>` CSP (workers take their policy from response headers, which Pages can't set). It is our own code, and makes only same-origin requests.

## Refactor notes

These are the known structural debts, roughly in the order they should be paid down. Each has a matching item in [ROADMAP.md](ROADMAP.md).

1. **Split `src/index.html` into modules.** The inline script is about 1,270 lines in 23 sections that call each other in both directions (for example, editing calls `redraw`, and `redraw` calls editing helpers). **Decision (23 Oct 2026): not before the first production event, and as a build-time bundle first.**
   - **Phase 1, bundle at build:** split the source into ordered files (`src/app/00-state.js` … `90-boot.js`, one per current section group). The build joins them, in order, into one content-hashed `app.js` loaded with `<script src integrity>`, and the inline script shrinks to almost nothing. Behaviour can't change, because the code still shares one scope. There are no cycles to untangle, and browser support stays the same. Wins: a smaller `index.html`, JS cached between deploys, and Chrome's compiled-code cache. `verify.mjs` checks that the bundle is referenced, hashed and SRI-correct. To prove nothing changed: pixel-identical output for Blocks and Retro pixel against the previous build, plus the editing, kiosk, offline and deploy, update-flow, worker and diagnostics browser checks.
   - **Phase 2, native ES modules (best practice):** do this once the Playwright tests exist, and once the oldest supported device runs iOS/iPadOS 16.4+ (needed for import maps). Steps:
     - **Layer the code so imports never form a cycle:** `state` → pure logic (styles and colour matching, layout and print maths, masks) → rendering (`textures`, `worlds`, `render3d`, `compose`) → UI (`edit`, `inputs`, `kiosk`, `diag`, `update`, `ui`). Lower layers never import UI; UI passes callbacks down.
     - **Serve each module under its content hash** through an inline import map (one more CSP hash, no loosening), with `modulepreload` and `integrity` for every module.
     - **Unit-test the pure modules** with `node --test` (refactor note 8).
     - **Add Vite only if the build grows too complex.** `verify.mjs` stays the gate either way.
2. ~~**Store model weights as binary.**~~ Done. Measured: model files 13.2 MB → 9.97 MB on disk, but over the wire only 9.50 MB → 9.00 MB gzipped (Pages already gzipped the base64), so the expected 25 % download saving didn't materialise. Load is faster with no base64 decode (people model 1,134 → 1,001 ms, cut-out model 482 → 320 ms at 6× CPU throttle), the page no longer builds a 12.6 MB string, and model files are now integrity-checked.
3. ~~**Move detection and segmentation into a Web Worker.**~~ Done; see "Detection worker" above. The longest freeze while finding people went from 48.5 s to 0 (headless Chromium, CPU backend). What still runs on the page is block conversion and drawing ("Placing blocks", about 5.6 s there).
4. **Generate world thumbnails at build time.** Half done: the thumbnails are now hashed JPEGs in `src/thumbs/` (35 KB in total, cached between deploys) instead of base64 in the HTML, which took `index.html` from 73 KB to 42 KB gzipped and let `img-src` drop `data:`. Still open: render them in CI with Playwright from the same world code, so they can't drift from the worlds.
5. **Remove Claude-artifact code paths.** `window.claude.use("downloads")` in the save code is dead on Pages. Remove it so saving has a single path: the standard download.
6. **Name the magic numbers.** Thresholds (alpha 0.42, crowd 0.35, merge 0.55 × shoulder width, flood 26 ΔE), sheet geometry and timing constants should become named constants in one place, with comments on how they were tuned.
7. ~~**Make the style layer pluggable.**~~ Done; see "Styles" above. Blocks render pixel-for-pixel as before.
8. **Tests around pure functions.** `sizeForCount`, `layoutFor`, `personMask` (strokes and flood), the NMS in `findPeople` and colour matching are pure or nearly so. Pull them into modules and unit-test them with `node --test`.
