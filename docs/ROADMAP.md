# Roadmap and to-dos

Status: `[ ]` open · `[~]` in progress · `[x]` done. Priority: **P0** blocks events · **P1** next · **P2** later.

## P0: before each event

**First production event: 24 October 2026.** For events, pin a release in the Version picker (`/v/<version>/`) rather than freezing `main`. Setup, troubleshooting and rollback: [EVENT-RUNBOOK.md](EVENT-RUNBOOK.md).

- [~] **Test the camera and upload on real devices** over the Pages URL: Android Chrome, iOS Safari, and one tablet. The Claude-hosted copy can't open the camera on Android; the Pages build should. Script and `?debug=1` panel ready: [DEVICE-TEST.md](DEVICE-TEST.md) Parts A–C.
- [~] **Do a test print on the StickerPix.** The sheet margin (0.15 in) and gap between stickers (0.12 in) in `SHEET` are estimates. Print a 2, 4 and 8-up sheet and adjust. Steps and reference sizes: [DEVICE-TEST.md](DEVICE-TEST.md) Part D.
- [~] **Check the Design Space workflow.** Upload a cut-out PNG and a world PNG, confirm the kiss-cut follows the outline / the white border, and confirm that setting the project quantity lays out N copies as expected. Steps: [DEVICE-TEST.md](DEVICE-TEST.md) Part E.
- [ ] **Run a full event dry run:** about 20 people back to back on one device. Watch memory, heat and speed on the phone that will be used.

## P1: quality and reliability

- [ ] **Halve the people model download** with uint8 quantization (about 9.4 MB → 4.7 MB). The weights are already float16, so float16 conversion gains nothing. uint8 is lossier: compare detections on the test photos in `tests/fixtures/` (`npm run test:e2e` checks the counts) before shipping.
- [~] **Make "Placing blocks" faster.** Measured: the pause was mostly the 3D world being re-rendered on every 1 px change in shape; worlds are now cached by size bucket (1.5.1). With a world: 1.2–10.2 s → 0.13–0.34 s in headless Chromium. Without one it was already 0.6–0.8 s. Still open: the first render of each world (about 7 s in software GL, far less on a GPU) could be warmed while people are being detected, and `convert` could move to the worker if real devices show it matters.
- [~] **Improve cut-outs for seated or partly hidden people** (as in the car photo). Evaluate MediaPipe's multiclass selfie segmenter (Apache-2.0); it needs `'wasm-unsafe-eval'`, so weigh that against keeping the CSP strict. With a green or blue screen this is solved (1.4.0); without one it still needs a better model.
- [ ] **Edge-aware cell sampling** ("Pixelated Image Abstraction", Gerstner et al. 2012): cells as superpixels that follow edges, so eyes and mouths stay sharp without dithering.
- [ ] **Better detection on close-ups and big groups:** faces-only shots find nobody (the cut-out then falls back to colour), and big groups can be off by one (6 of 7, 10 of 9 in testing).
- [~] **Unit tests** for the pure functions (refactor note 8). `node --test` runs in `npm test`; the changelog and release-notes parser is covered (1.5.2). Still open: the app's pure functions (`toLab`, `kmeans`, `keyColor`, the world size buckets), which live inside the bundled `app.js` and need loading in a `vm` context or the module split, phase 2.
- [ ] **Speed up the e2e suite.** Detection in CI runs without a GPU, so each photo takes 1.5–2.5 minutes and the suite about 8 minutes. If it grows, cache the Playwright browser and split the spec files across jobs.
- [~] **More styles beyond blocks**, picked next to the world picker. The `Style` interface (refactor note 7) and Retro pixel are done; each further style is one entry in `STYLES`. Every style is a generic look with original art: no game, toy or brand names, logos or characters. Candidates, roughly by appeal and effort:
  - ~~**Emoji mosaic**~~ done in 1.3.0 (73 Noto Emoji; skin from skin-tone hands).
  - ~~**Retro pixel (8-bit / 16-bit)**~~ done: DawnBringer 16 or 4 handheld greens, with ordered dithering. Still open: an optional scanline frame.
  - **Plastic bricks:** studded brick tops with soft shading; also works as a build guide with a parts list, like the block CSV.
  - **Fuse beads:** round beads on a pegboard grid, with a bead-count list for making the real thing.
  - **Comic / pop art:** halftone dots, bold outlines and an optional speech bubble.
  - **Neon outline:** glowing outlines on dark worlds.
  - **Cross-stitch:** a stitch grid with a thread list.
  - Matching worlds for each style where it fits, such as a pixel city or a brick plate.
- [ ] **Accessibility:** keyboard move/resize for the selected person (arrow keys, +/−), visible focus on the canvas, and live-region announcements for "N people found" and saves.

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
