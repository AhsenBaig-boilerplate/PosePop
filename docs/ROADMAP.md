# Roadmap and to-dos

Status: `[ ]` open · `[~]` in progress · `[x]` done. Priority: **P0** blocks events · **P1** next · **P2** later.

## P0: before each event

**First production event: 24 October 2026.** For events, pin a release in the Version picker (`/v/<version>/`) rather than freezing `main`. Setup, troubleshooting and rollback: [EVENT-RUNBOOK.md](EVENT-RUNBOOK.md).

- [~] **Test the camera and upload on real devices** over the Pages URL: Android Chrome, iOS Safari, and one tablet. The Claude-hosted copy can't open the camera on Android; the Pages build should. Script and `?debug=1` panel ready: [DEVICE-TEST.md](DEVICE-TEST.md) Parts A–C.
- [~] **Do a test print on the StickerPix.** The sheet margin (0.15 in) and gap between stickers (0.12 in) in `SHEET` are estimates. Print a 2, 4 and 8-up sheet and adjust. Steps and reference sizes: [DEVICE-TEST.md](DEVICE-TEST.md) Part D.
- [~] **Check the Design Space workflow.** Upload a cut-out PNG and a world PNG, confirm the kiss-cut follows the outline / the white border, and confirm that setting the project quantity lays out N copies as expected. Steps: [DEVICE-TEST.md](DEVICE-TEST.md) Part E.
- [ ] **Run a full event dry run:** about 20 people back to back on one device. Watch memory, heat and speed on the phone that will be used.

## P1: quality and reliability

- [~] **Make "Placing blocks" faster.** Measured: the pause was mostly the 3D world being re-rendered on every 1 px change in shape; worlds are now cached by size bucket (1.5.1). With a world: 1.2–10.2 s → 0.13–0.34 s in headless Chromium. Without one it was already 0.6–0.8 s. Still open: the first render of each world (about 7 s in software GL, far less on a GPU) could be warmed while people are being detected, and `convert` could move to the worker if real devices show it matters.
- [~] **Improve cut-outs for seated or partly hidden people** (as in the car photo). 1.10.0 gates Selfie Segmentation with BodyPix (Apache-2.0, on the TF.js already shipped, no CSP change): the car seat, chairs, flags and smudges between legs are gone on the NASA photos. Still open: thin parts both models miss (the raised hand in `seated.jpg`), and faint seams in `group7.jpg`. The gap between neighbours in `group6.jpg` (a box that stopped at the waist) is fixed in 1.10.1; its side effect is that in `group7.jpg` the right-hand person's box now reaches over the mission emblem, so a little more of it shows. MediaPipe's multiclass segmenter would need `'wasm-unsafe-eval'`; revisit only if real event photos still show problems. With a green or blue screen this is solved (1.4.0).
- [ ] **Photo brush, the painted person** (P2): since 1.13.2 a stroke redraws only the people it touches, but that person is rebuilt in full every frame (about 30 ms of the ~80 ms per frame on `group7.jpg` in headless Chromium). Rebuilding only the changed rectangle would cut it further; worth it only if the event tablet feels slow.
- [ ] **Emoji keyboard e2e flake** (P2): once on CI, two arrow presses became two undo steps instead of one burst. It passed on retry and didn't reproduce locally even at 60× CPU slowdown. If it recurs, look at the 600 ms burst timer in `082` against slow CI frames.
- [ ] **Edge-aware cell sampling** ("Pixelated Image Abstraction", Gerstner et al. 2012): cells as superpixels that follow edges, so eyes and mouths stay sharp without dithering.
- [ ] **Better detection on close-ups and big groups:** faces-only shots find nobody (the cut-out then falls back to colour), and big groups can be off by one (6 of 7, 10 of 9 in testing).
- [x] **Unit tests** for the pure functions (refactor note 8), in `npm test` (1.5.3). The pure functions now live in `src/app/007-pure-functions.js`, which the tests load on its own in a bare `vm`, with no page, so the file can't quietly start depending on the DOM. They check `toLab` against reference colours, `deltaE00` against Sharma's published pairs, `kmeans`, `keyColor`, `errorDiffuse` and `sceneBucket`, plus the changelog parser (1.5.2). New pure helpers go in that file, with a test.
- [ ] **Speed up the e2e suite.** Detection in CI runs without a GPU, so each photo takes 1.5–2.5 minutes and the suite about 8 minutes. If it grows, cache the Playwright browser and split the spec files across jobs.
- [~] **More styles beyond blocks**, picked next to the world picker. The `Style` interface (refactor note 7) and Retro pixel are done; each further style is one entry in `STYLES`. Every style is a generic look with original art: no game, toy or brand names, logos or characters. Candidates, roughly by appeal and effort:
  - ~~**Emoji mosaic**~~ done in 1.3.0 (73 Noto Emoji; skin from skin-tone hands).
  - ~~**Retro pixel (8-bit / 16-bit)**~~ done: DawnBringer 16 or 4 handheld greens, with ordered dithering. Still open: an optional scanline frame.
  - ~~**Plastic bricks**~~ done in 1.11.0 as **Bricks**: 33 generic brick colors in 3 groups, each cell a stud, with a brick list (1 × 1 to 1 × 8 per color) and the 32 × 32 baseplate count. Still open: a brick plate world.
  - ~~**Fuse beads**~~ done in 1.9.0: 36 generic bead colors in 4 groups, each bead drawn as a ring, with a bead list and the 29 × 29 pegboard count. Still open: a pegboard world, and pegboard lines on the grid overlay.
  - **Comic / pop art:** halftone dots, bold outlines and an optional speech bubble.
  - **Neon outline:** glowing outlines on dark worlds.
  - **Cross-stitch:** a stitch grid with a thread list.
  - Matching worlds for each style where it fits, such as a pixel city or a brick plate.
- [ ] **Accessibility, next steps:** a keyboard way to erase (for example, a movable brush cursor), keyboard edits for Adjust boxes, and a screen-reader pass on iOS VoiceOver and Android TalkBack on the event devices.

## P2: product growth

- [ ] **More worlds**, and a picker that previews the world behind the current photo.
- [ ] **Event branding:** an optional logo or event name strip on prints, set by a URL parameter or a small config file.
- [ ] **Direct printing guidance** for other printers (Print Then Cut on Cricut Explore/Maker, standard 4 × 6 photo printers).
- [ ] **Custom domain and security headers.** Front Pages with a CDN that can set HSTS, `frame-ancestors`, `Permissions-Policy: camera=(self)` and `X-Content-Type-Options`.
- [ ] **Clean up the Claude-artifact leftovers** (refactor note 5): `window.claude.use("downloads")` in the save code.
- [ ] **Module split, phase 2** (refactor note 1): native ES modules with a layered import graph, now that the Playwright tests exist to catch regressions, once the minimum device is iOS 16.4+. Phase 1 (bundled `src/app/*.js`) is done.
- [ ] **Generate world thumbnails in CI** from the world code (refactor note 4). They're already hashed files; this stops them drifting from the worlds.
- [ ] **Name the tuning constants** (refactor note 6).

## Done

- [x] **Edits across Detail and Zoom (1.13.3):** strokes, Erase area points and adjusted boxes are stored as fractions of the whole photo, the stroke radius as a fraction of its width (`toWork`/`toPhoto`/`boxToWork` in `050`). Detail no longer changes what an old stroke covers (on `group7.jpg` a stroke made at 64 covered 0.46× as much at 128; now 1.1×), and the Zoom toggle no longer calls `resetEdits()`.
- [x] **Faster Photo brush (1.13.2):** `photoLayer` (`065`) caches each person's cut-out by what it's made of (its box, and which cells are drawn or restored) instead of by the view, so a stroke redraws only the people it touches. Layers are made at the drawn size (the photo scaled by 1, ½, ¼ …, never below the target), and the white border is one cached ring per person (`borderRing`) instead of 16 draws a frame. A 30-move stroke on `group7.jpg`: long tasks 7.5 s → 2.5 s (longest 249 → 124 ms); a 4000 px copy with Zoom off: 14.4 s → 2.1 s (609 → 90 ms). Output matches the old drawing except for anti-aliasing at the edges.
- [x] **Kiosk idle reset (1.13.1):** after 90 s with no tap or key, saved or not, the kiosk returns to the start screen and forgets the photo (a privacy fix: before, only a save started the reset).
- [x] **Choose an emoji from the keyboard (1.13.0):** E and Shift+E cycle through the emoji on the picture, front first (`pickDeco` in `082`), announced with their place; the emoji keys then act on the chosen one.
- [x] **Brush ring (1.12.0):** Erase and Restore show a ring the size of the stroke (`brushShow` in `080`; red and dashed for Erase, green and solid for Restore) in place of the crosshair. Mouse and pen show it while hovering, touch while painting. The Brush slider previews the size in the middle of the picture.
- [x] **Bricks style (1.11.0):** one new `STYLES` entry, with generic color names. The brick list (CSV) has each color's studs, RGB and 1 × n bricks (`brickRuns()`, a unit-tested pure function), and the baseplates (`pegboards()`). A new optional `material` field names what the people are made of when that isn't the unit counted.
- [x] **Fuse beads style (1.9.0):** one new `STYLES` entry. Bead colors use generic names (no maker's), with a Skin & hair group for faces. The bead list (CSV) has each color's count and RGB, and the pegboards it takes (`pegboards()`, a unit-tested pure function). The small-cell print warning now comes from each style's `minPx`, and the materials summary from `extra()`.
- [x] **Emoji on the picture (1.8.0):** 51 Noto Emoji as vector SVG (sharp at 300 dpi) to put on top of the picture, with move, resize and turn (handle, pinch, wheel, sliders, keys), bring to front, remove and undo. On a cut-out sticker the white cut border goes round them. Kiosk guests can add them. Handles keep one size on screen and are bigger on touch screens. Since 1.13.0, **E** chooses an existing emoji from the keyboard. Still open: on cut-out stickers, emoji with loose bits (confetti) leave small separate cut pieces; check them on a test print.
- [x] **The picture stays in view (1.7.0):** the preview and sheet are sticky beside the settings on wide screens and pinned to the top on phones. The settings are in four tabs (Style, World, Edit, Print) with less-used options under More options, and Undo, Redo, Hold to compare and Save sticker sit under the picture.
- [x] **Keyboard editing and announcements (1.6.0):**
  - a "Skip to the picture" link on the first Tab
  - a focusable preview with a visible focus outline
  - arrows move the group or the selected person (Shift for five blocks), + and − resize, and [ and ] choose a person in Move each, with each burst of keys as one undo step
  - the preview's label matches what it shows (for example "7 people made of blocks, on plains")
  - people found, saves, the selected person, size, undo and redo are announced to screen readers
- [x] **uint8 people model: tried, not shipped (27 October 2026).** TF.js loads per-tensor uint8 weights natively, so the 9.45 MB MoveNet file could drop to 4.80 MB. Compared with float16 on the test photos, which give identical results run to run (box IoU 1.0, same cells):
  - **All large tensors in uint8 (4.80 MB):** an extra person on `single.jpg` and `greenscreen.jpg` (whose cut-out lost 88 % of its cells), and one box on `group7.jpg` at IoU 0.30.
  - **Kept the 5 depthwise kernels below 25 dB SNR in float16 (4.85 MB):** worse. 3 people instead of 1 on `greenscreen.jpg`, 4 instead of 3 on `group6.jpg`, and IoU 0.39 on `group7.jpg`.
  - **Kept the 9 tensors below 30 dB in float16 (5.49 MB):** exact on `single.jpg` and close on `group6.jpg`, but still 3 people instead of 1 on `greenscreen.jpg`.
  - **Verdict:** per-tensor uint8 is too coarse for this model, and the next threshold (35 dB) would save only 19 % (7.62 MB). The model downloads once and is then cached for offline use, so the risk isn't worth it. Revisit only with per-channel quantization (not in TF.js's weight format) or a smaller model, and measure the same way: people count, box IoU and filled cells against float16, before and after.
- [x] End-to-end tests in CI (1.5.2): Playwright against `dist/` on four NASA photos (single, seated, group of 7, green screen). They cover detection counts and the worker, the backdrop key, move group and each, resize, erase, undo and redo, the 300 dpi save, the update flow (a newer `version.json`, with and without work in progress), the version picker and release notes (notes stay text), and offline reloads. Any page error, console error or CSP violation fails a test, and deploys wait for the suite
- [x] World renders cached by size bucket: "Placing blocks" with a world 1.2–10.2 s → 0.13–0.34 s (1.5.1)
- [x] Release notes in the app: headlines in the Version picker and a What's new panel, from `CHANGELOG.md` (1.5.0)
- [x] Green or blue screen backdrop key, with despill and a clothes warning (1.4.0)
- [x] Licence: Apache-2.0 (`LICENSE`, `NOTICE`, `package.json`)
- [x] Emoji style: 73 Noto Emoji, with skin from skin-tone hands and no animals, foods or double-meaning emoji on faces (1.3.0)
- [x] Module split, phase 1 (refactor note 1): `src/app/*.js` bundled into one hashed `app.js`; no inline script; CSP `script-src 'self'`
- [x] Photo style (real photo, background removed, no blocks) and new backgrounds: original photo, colour, your own image (1.2.0)
- [x] Versions: semantic versions with signed tags, `CHANGELOG.md`, every release published at `/v/<version>/` (never auto-updates), a Version picker, and per-version offline caches
- [x] Clean look: lone-cell pass (busyness −2 to −6 points on all 10 test photos, colour error unchanged, faces intact) and a colour-error figure in `?debug=1`
- [x] **Clean look** (default) for phone photos: people's contrast and saturation lift, a short per-photo palette (k-means, smooth blocks first) that keeps eyes and mouths, no dithering. Neighbouring cells that differ 69 % → 11 % on the photo-like demo. **Detailed** keeps the previous behaviour. Tune `LOOK_*` on the real test photos when they arrive
- [x] Pluggable styles (refactor note 7): a `Style` interface (`palette`, `toCells`, `drawCell`) with Blocks unchanged and **Retro pixel** as the second style, picked above the worlds
- [x] Kiosk mode (`?kiosk=1`): start screen, full screen and wake lock, live camera with a 3-2-1 countdown, big Retake/Save, reset to the start screen 60 s after a save (clears the guest's photo), settings behind a 1.5 s long-press
- [x] Person detection in a Web Worker with OffscreenCanvas (refactor note 3), with a page fallback and live progress ("Finding people (pass 2 of 4)…"); longest freeze while finding people 48.5 s → 0 in testing
- [x] Offline support: service worker with one integrity-checked cache per build, network-first page, old caches deleted on activate, "works offline" in the footer
- [x] World thumbnails as hashed JPEG files instead of base64 in the HTML (`index.html` 73 KB → 42 KB gzipped); `img-src` no longer allows `data:`
- [x] Version line in the footer (version, build time, update status); tf.js preloaded and models downloaded in parallel with it (time to detection ready −14 % on a 10 Mbit/s link)
- [x] Binary model weights loaded with `tf.loadGraphModel`, hashed and SRI-checked (refactor note 2)
- [x] Move the whole group by default, or each person on their own; Adjust boxes mode to fix who owns which blocks and crop leftovers by dragging each person's box edges
- [x] Diagnostics panel (`?debug=1`): build, detection status and timings, photo size, device memory, WebGL renderer, tf.js memory, errors; copyable report. Device and test-print script in [DEVICE-TEST.md](DEVICE-TEST.md)
- [x] Cut people out of real photos (MoveNet MultiPose + MediaPipe Selfie Segmentation), including groups and people at the edges
- [x] 3D block worlds: Plains, Village, Mountains, Snowy taiga, Desert, Beach sunset, Nether (crimson forest, portal, lava sea), End (city, pillars, exit portal)
- [x] Move, resize (handles, pinch, wheel, slider), erase, erase area, restore, undo/redo
- [x] StickerPix sizing: stickers per sheet, custom width, 4 × 6 photo, 300 dpi PNGs, block-list CSV
- [x] Hashed assets, self-update without hard refresh, strict CSP, SRI, self-hosted dependencies
- [x] CI build/verify/deploy to GitHub Pages with pinned actions and least privilege; Dependabot
