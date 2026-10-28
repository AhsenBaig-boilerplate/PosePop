# Architecture

PosePop is a static, client-only web app. There is no server and no API: GitHub Pages serves files, and everything else (people detection, cut-out, block conversion, 3D rendering, print layout) runs in the visitor's browser.

## Repository layout

```
src/
  index.html          markup and styles (no inline script)
  app/                the app, one file per section (000-core.js … 120-boot.js), joined in name order into app.js
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
tests/
  unit/               node --test (run by npm test)
  e2e/                Playwright against dist/ (npm run test:e2e)
  fixtures/           NASA test photos and where they came from (README.md)
playwright.config.mjs
.github/workflows/pages.yml   CI: build + verify + unit and e2e tests on PRs, deploy on main once both pass
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
| Worlds | `makeWorld`, `buildScene`, `renderScene` | Seeded voxel worlds; instanced meshes per block type; columns culled to the camera's view. `renderScene` renders each world once per size bucket (`SCENE_BUCKET` 256 px on the long side, `SCENE_ASPECT_STEP` 0.08) and crops to the exact shape, bottom-aligned and never stretched. Before this, every 1 px change in shape (detail, crop) re-rendered the whole world. |
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
| `textured` | Offers "3D block edges". |
| `minPx` | Optional. Warns when a cell prints smaller than this many pixels at 300 dpi. |
| `unit`, `units`, `kinds`, `title`, `paletteLabel`, `listName`, `amount(n)`, `csv(list)` | The words and counts in the controls, the materials list and the CSV. |
| `extra(total)` | Optional. More in the materials summary: stacks for Blocks, pegboards for Fuse beads. |

| Style | Palette | `toCells` | `drawCell` |
|---|---|---|---|
| Blocks | 83 textured blocks in 4 groups | Floyd–Steinberg error diffusion | 16×16 texture plus optional bevel |
| Retro pixel | DawnBringer 16 (free to use), or 4 handheld greens | 4×4 ordered (Bayer) dithering, for the checkerboard look of old consoles | Flat colour |
| Fuse beads | 36 generic bead colors in 4 groups (Basics, Skin & hair, Pastels, Neons) | Floyd–Steinberg error diffusion | A ring with its hole and a soft highlight, on a darker shade of the same color; a plain square below 5 px |
| Emoji | 73 Noto Emoji (Apache-2.0), in 3 groups | Floyd–Steinberg, matched on each emoji's average opaque colour | A tile of that colour with the emoji on top |

**Emoji curation** (the `EMOJI` list in `build.mjs`): the build copies each chosen PNG from the pinned `emoji-datasource-google` as a hashed asset, and writes the list into the app as `__EMOJI__`. The images load when the style is first picked (`loadEmoji`). Two rules apply, because every face at an event is drawn with them: **skin must come from neutral emoji** (raised hands in 5 skin tones, hearts, squares), so animals and foods whose colour falls in the skin-tone range are excluded; and **no emoji with well-known double meanings**. Check new candidates on several real photos across skin tones before adding them.

**Look** (`S.look`, Style tab) applies to every style:

- **Clean** (default): a gentle contrast (`LOOK_STRETCH`) and saturation (`LOOK_SAT`) lift taken from the people's own 2nd–98th brightness percentiles. Then `LOOK_K` k-means clusters of the people's colours, each snapped to the closest block with a cost for grainy textures (`LOOK_SMOOTH`, using each block's `busy`). Colours further than `LOOK_KEEP` ΔE from every cluster, on at least `LOOK_KEEP_N` cells, keep their own block, which is what preserves eyes and mouths. Cells are then matched to that short palette. After that, **lone cells** (no neighbour with the same block, but 3 or more neighbours sharing another block) join that block if it is within `LOOK_SPECK` ΔE2000. That removes shading flips but keeps genuinely different 1-cell features such as pupils. Dithering is off by default, and the lone-cell pass is skipped when it's on.
- **Detailed:** the full palette with dithering, byte-for-byte the previous behaviour.
- **Tried and dropped:** an edge-preserving (Kuwahara) smoothing pass erased eyes and mouths at normal detail. Shrinking the photo to cell size already averages away sensor noise. **CIEDE2000 for choosing blocks** pulled dark greys towards blue on real photos, so matching stays on plain Lab distance, and CIEDE2000 is used only to judge lone cells and for the colour-error figure. A **"connected cells only"** keep rule cut block types sharply but lost eye whites.
- **Measuring:** `?debug=1` shows **Photo → busyness**, the share of neighbouring person cells that differ, and **Photo → color error**, the mean ΔE2000 between each person cell's own colour and its block. Judge a change on both, and on the faces: busyness alone can improve while colours get worse. `?sample=photo` gives the built-in demo uneven light, sensor noise and softness, always identically. On it, at 64 blocks wide, Detailed scores 69% with 43 block types and Clean 11% with 16.

**Photo style** (`STYLES.photo`): no cells are drawn. `compose()` draws each person with `photoLayer(Lr)`: the work image × the detector mask × that person's cells. The cells are grown by one into empty space, so the photo's soft edge sets the outline, while splits between people and erasing follow the cells. Each layer is limited to the person's own box and cached per view. The detector mask is sharpened (`PHOTO_EDGE`, smoothstep 0.35 → 0.65), because Selfie Segmentation is only 30–60% sure about legs, and drawn as is that leaves see-through smudges. Patches it gets wrong, usually between the legs, are removed with **Erase area**; a full-body model is the real fix (see the roadmap). The Cut-out border is the silhouette drawn in white at 16 offsets. Palette, look, dithering, CSV and the materials list are hidden.

**Backgrounds** (`S.scene`): 3D worlds (`isWorld`), `none` (transparent Cut-out), and the backdrops in `BACKDROPS`:
- **`original`:** the work image's crop, drawn at the people's own scale (not the 0.86 used for worlds), so unmoved people sit exactly where they were. No shadow.
- **`color`:** `S.bgColor`.
- **`image`:** `S.bgImage`, decoded like a photo and kept only in memory, operator only in kiosk mode.

Thumbnails follow the photo, the colour and the image (`backdropThumbs`).

To add a style, add an entry to `STYLES`. The picker above the worlds lists every entry, and every label that names the cells follows the style. New art (for example an emoji set) must be self-hosted from a pinned package under an open licence and listed in `THIRD_PARTY_NOTICES.md`. Names stay generic: no game, toy or brand names.

## Versions and releases

| URL | What it is | Updates |
|---|---|---|
| `/PosePop/` | **Latest:** the current `main` | Itself, through `version.json` (see Caching in the README) |
| `/PosePop/v/<version>/` | **A release:** a signed `v<version>` tag, built from its own source and lockfile | Never. Its `version.json` never changes, so it stays exactly as tested |

- **Version label:** `build.mjs` stamps `package.json`'s version into the page and `version.json`. A commit that carries the matching tag shows `1.2.0`; anything else shows `1.2.0+<commit>`. Like the build time, it's filled in after hashing, so it never changes the content hash.
- **Publishing:** `scripts/releases.mjs` runs on every deploy. It builds each `v*` tag in a temporary worktree (`npm ci`, then that tag's own `build.mjs`), copies its `dist/` to `dist/v/<version>/`, and writes `releases.json` (latest plus releases, newest first). `verify.mjs` checks that every listed release folder holds the listed build, and that nothing unlisted is in `dist/v/`. Rebuilding a tag reproduces its build id exactly; for example, `v1.0.0` rebuilds as `65c125a-e5f984fcb878`.
- **Release notes:** `scripts/changelog.mjs` reads `CHANGELOG.md` (`## <version> (<date>)` headings with bullet or paragraph notes) and puts each version's `headline` (the first bold phrase) and `notes` into `releases.json`, for Latest and every release. Notes always come from the current changelog, so corrections reach older releases too. The picker shows "<version> · <date> — <headline>", and **What's new** lists every version's notes, with the current one highlighted. Notes are drawn as text with `**bold**` and `` `code` `` only (`richText`), never as HTML.
- **Version picker:** the footer's **Version** select (operator view in kiosk mode) reads `releases.json` from the site root and moves to the chosen version, keeping the query (`?kiosk=1`, `?debug=1`). It stays hidden when the list can't load (offline, local builds). A release built before 1.1.0, such as 1.0.0, has no picker; open the site root to go back to Latest.
- **Offline per version:** each folder registers its own `sw.js`, and the more specific scope wins for its pages. Since 1.1.0, cache names are `posepop|<folder>|<build>`, and a worker deletes only its own folder's old caches. Caches named in the older `posepop-<build>` form (1.0.0) are removed by Latest only when `releases.json` loads and doesn't list that build, so a pinned 1.0.0 keeps its offline copy.
- **Deploys:** Pages only accepts deploys from `main`, so releases go out on the next deploy from `main` (`gh workflow run … --ref main`). Deploys are queued one at a time (`concurrency: pages-deploy`).

## Backdrop key (green or blue screen)

`src/app/077-backdrop-key.js`. When **Green or blue screen behind people** is on (`S.key.on`), `applyKey()` replaces the detector's mask with a colour key:

- **Finding the screen colour:** the most common strongly coloured hue across the photo (YCbCr chroma, 32×32 bins), covering at least `KEY_MIN_COVER` (8%) of the photo and clearly green or blue. Red or skin-coloured "screens" are refused, because they would cut into people. A white frame or a light stand doesn't confuse it.
- **Mask:** smoothstep on chroma distance from the screen colour. Screen removal (`S.key.tol`, 1–10) moves the band. Outside the detected people's boxes, everything is backdrop.
- **Despill:** near the screen colour, the screen's main channel is capped at the brighter of the other two, so green fringes go grey and don't glow.
- **Clothes warning:** if more than `KEY_CLOTHES` (45%) of what the detector is sure is a person would be keyed, the note warns that clothes in the screen colour are being cut out.
- **Switching:** `S.srcRaw` and `S.alphaML` keep the decoded photo and the detector's mask, so the key switches on and off, or retunes, without detecting again. With no screen found, the detector's mask is used.

Tested on a NASA green-screen photo (public domain, an unusual suspended pose): the detector kept only the legs and part of the torso; the key kept the whole person, crisply, in 0.3–0.4 s. On a blue studio backdrop with blue suits, the clothes warning fired (82%).

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

## Layout

- **The picture first, and sticky:** `.stage` (the preview, the to-scale sheet, and Undo, Redo, Hold to compare, Save sticker) comes first in the page, so reading and Tab order match what's on screen. On wide screens it sits left of the settings rail with `position:sticky`, and `#out` is capped at the viewport height less the action rows, so it never scrolls away. On phones (≤ 900 px) it pins to the top at about 40 % of the screen height, with a 64 px sheet beside it, and the settings scroll underneath. Screens under 561 px tall (landscape phones) and kiosk mode keep it in the page flow, where pinning would leave no room for the settings.
- **Settings tabs (`073-settings-tabs.js`):** the photo card stays above the tabs. **Style** (style, detail, look, palette, and More options), **World**, **Emoji**, **Edit** (tools, move modes, brush, size, resets) and **Print** (media, count, border, the other saves, Design Space steps) are WAI-ARIA tabs: one Tab stop, arrows and Home and End move between tabs and open them, and closed panels are `hidden`. Controls keep their ids, so the code that drives them doesn't know about tabs. In kiosk mode the tab row is operator-only, and the guest panels (`.tabpanel.guest`: Style, World and Emoji) are always shown.
- **Handles** (people's corners, box edges, the emoji frame) are sized with `handlePx` in CSS pixels, not canvas pixels: the preview canvas is 1100 px wide but often shown at about 300 px on a phone. They are 14 px, or 24 px on touch screens (`pointer:coarse`).
- **Tests:** `tests/e2e/layout.spec.mjs` checks the picture and Save stay on screen at the end of the Print settings on a 400 px phone and a 1280 px desktop, the tab keys, and the kiosk guest view. With `?debug=1` the diagnostics panel floats over the settings, so the tests' `closeDiag` (also called by `openTab`) collapses it first.

## Emoji on the picture (`078-emoji-on-picture.js`)

- **Images:** 51 Noto Emoji as vector SVG, from the pinned `@iconify-json/noto` (Apache-2.0, build-time only). `build.mjs` (`DECO`) wraps each icon body in an `<svg>`, refuses any with scripts, styles, `foreignObject`, embedded images, event attributes or references outside the file, and ships each as a hashed asset (precached for offline like the rest). The list reaches the app as `__DECO__`. The same content rules as the Emoji style apply: party and event themes, no brands, no double meanings. They load as `<img>`, so `img-src 'self'` covers them: **no CSP change**. An SVG drawn into a canvas from our own origin doesn't taint it, so saving works.
- **State:** `S.deco` is a list of `{k, x, y, s, r}`: the emoji, its centre (fractions of the picture), its size (fraction of the shorter side) and its turn (radians), drawn in order; `S.decoSel` is the selected one or −1. Both are in the undo snapshot and cleared by `resetEdits` (new photo, kiosk reset). Fractions keep emoji in the same place on the preview and the 300 dpi canvas.
- **Drawing:** `compose` calls `drawDeco` after the people. SVGs are drawn at their final size, so print is sharp. On a cut-out sticker (no backdrop) each emoji first gets a white outline as wide as the people's border, drawn the way the Photo style draws its border, so the kiss-cut goes round it.
- **Editing:** with the Move tool (not Adjust boxes) a press goes to the top emoji under it first (`decoDown`); a handle wins only when the press is nearer to it than to the emoji's centre, so small emoji stay draggable with big touch handles. The round handle resizes and turns around the centre, two fingers pinch and turn, and the wheel resizes. A press elsewhere deselects and goes on to the people. Keys (`decoKey` in `082`): arrows, + and −, [ and ] (15°), Delete, Escape.
- **Tests:** `tests/e2e/emoji.spec.mjs`.

## Accessibility

- **Keyboard (`082-keyboard-and-announcements.js`):**
  - `#out` has `tabindex="0"` and a "Skip to the picture" link (`a.skip`, operator-only like other controls) as the first Tab stop.
  - With the Move tool: arrows move `cur()` by one block (Shift: five), + and − scale it by 5 %, and [ and ] cycle `S.sel` in Move each. Keys go through `pushHist`/`quick`/`restyle` like a drag, and a burst (keys less than 600 ms apart) is one undo step.
  - Erase and Adjust boxes stay pointer-only for now.
  - Focusing the preview shows the keys in the `#hover` readout, and `aria-describedby="kbdHelp"` gives screen readers the same text.
- **Announcements:**
  - `#srcNote` ("N people found") and `#saveMsg` are `role="status"`.
  - `say()` writes short updates (person selected, size, moved, undone and redone) to the polite live region `#announce`, clearing it first so a repeated message is read again.
- **The preview's label:** `describeOut()` runs on every redraw, so the canvas's `aria-label` matches the style and backdrop, for example "7 people made of blocks, on plains".
- **Tests:** `tests/e2e/keyboard.spec.mjs`.

## Tests

- **Unit (`tests/unit/`, `node --test`):** run by `npm test`, so before every commit and in both CI jobs.
  - **The app's pure functions:** colour conversion and difference, k-means, dithering, screen-colour detection and world-render sizing live in `src/app/007-pure-functions.js` (with `005-random-noise.js`). `tests/unit/pure.mjs` loads just those two files in a bare `vm` context, with no `window`, no `document` and no app state, so a DOM reference in them fails the tests. Results are passed back through `structuredClone`, so they compare as ordinary arrays. Reference values: `toLab` on sRGB primaries, and `deltaE00` on Sharma, Wu & Dalal's published test pairs.
  - **The release-notes parser:** also checks that `CHANGELOG.md` has a dated entry for `package.json`'s version.
- **End-to-end (`tests/e2e/`, Playwright):** run against the built `dist/`, served by `scripts/serve.mjs` with production caching, in their own CI job; deploys wait for it. `tests/e2e/fixtures.mjs` fails any test that sees a page error, a console error or a CSP violation.
- **Reading state:** `app.js` is one closed scope, so with `?debug=1` only, `112-test-snapshot.js` adds `window.posepopState()`. It returns a plain-data copy: people found, filled cells, each person's centre on the preview, the group's move and size, and edit counts. Without `?debug=1` it doesn't exist, and nothing in it can change the app. Tests drive the app only through the UI.
- **Waiting:** the CSP blocks string eval, so `page.waitForFunction` fails. Use `expect.poll` and locator assertions (polling from the test side). `page.evaluate` works, because it runs over the DevTools protocol.
- **Updates and the picker:** these tests block the service worker (`serviceWorkers: "block"`) so that `page.route` can answer `version.json` and `releases.json`. The offline test keeps it.
- **Photos:** only the NASA photos in `tests/fixtures/` (sources in its README). Traces and screenshots from failed CI runs contain only those.
- **Locally:** `npm run build && npm run test:e2e`. Where Playwright can't install its own Chromium (Ubuntu 20.04, for example), set `PW_CHROMIUM` to a Chromium binary, or run inside the `mcr.microsoft.com/playwright:v<version>-noble` image.

## Refactor notes

These are the known structural debts, roughly in the order they should be paid down. Each has a matching item in [ROADMAP.md](ROADMAP.md).

1. **Split `src/index.html` into modules.** The inline script is about 1,270 lines in 23 sections that call each other in both directions (for example, editing calls `redraw`, and `redraw` calls editing helpers). **Decision (23 Oct 2026): not before the first production event, and as a build-time bundle first.**
   - **Phase 1, done (Oct 2026):** the inline script is now `src/app/000-core.js` … `120-boot.js`, one file per section. `build.mjs` joins them in name order into one scope, wrapped as before, and publishes `app.<hash>.js` with SRI. Build facts (id, time, version) moved to `<meta>` tags, so the app's hash depends only on its code. With no inline script left, the CSP is `script-src 'self'` with no hash, and `verify.mjs` fails on any inline `<script>`. Proof of no behaviour change: the code matches the old inline script except the build-facts line and blank lines between sections; Blocks, Detailed, Retro pixel and Photo on four backgrounds are pixel-identical to the previous build; and the kiosk, worker, editing, deploy, offline, version and diagnostics checks pass.
   - **Phase 1 as planned:** split the source into ordered files (`src/app/00-state.js` … `90-boot.js`, one per current section group). The build joins them, in order, into one content-hashed `app.js` loaded with `<script src integrity>`, and the inline script shrinks to almost nothing. Behaviour can't change, because the code still shares one scope. There are no cycles to untangle, and browser support stays the same. Wins: a smaller `index.html`, JS cached between deploys, and Chrome's compiled-code cache. `verify.mjs` checks that the bundle is referenced, hashed and SRI-correct. To prove nothing changed: pixel-identical output for Blocks and Retro pixel against the previous build, plus the editing, kiosk, offline and deploy, update-flow, worker and diagnostics browser checks.
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
