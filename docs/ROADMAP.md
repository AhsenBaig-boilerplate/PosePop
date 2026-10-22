# Roadmap and to-dos

Status: `[ ]` open · `[~]` in progress · `[x]` done. Priority: **P0** blocks events · **P1** next · **P2** later.

## P0: before the first event

- [~] **Test the camera and upload on real devices** over the Pages URL: Android Chrome, iOS Safari, and one tablet. The Claude-hosted copy can't open the camera on Android; the Pages build should. Script and `?debug=1` panel ready: [DEVICE-TEST.md](DEVICE-TEST.md) Parts A–C.
- [~] **Do a test print on the StickerPix.** The sheet margin (0.15 in) and gap between stickers (0.12 in) in `SHEET` are estimates. Print a 2, 4 and 8-up sheet and adjust. Steps and reference sizes: [DEVICE-TEST.md](DEVICE-TEST.md) Part D.
- [~] **Check the Design Space workflow.** Upload a cut-out PNG and a world PNG, confirm the kiss-cut follows the outline / the white border, and confirm that setting the project quantity lays out N copies as expected. Steps: [DEVICE-TEST.md](DEVICE-TEST.md) Part E.
- [ ] **Choose a licence for PosePop's own code** (for example MIT or Apache-2.0) and add `LICENSE`. `THIRD_PARTY_NOTICES.md` covers the bundled components.
- [ ] **Run a full event dry run:** about 20 people back to back on one device. Watch memory, heat and speed on the phone that will be used.

## P1: quality and reliability

- [ ] **Offline support for events with flaky Wi-Fi.** Add a service worker that caches the hashed assets for the current build and is versioned by build id, so updates still flow. Must stay within the current CSP.
- [ ] **Store model weights as binary** (refactor note 2). Faster first load on phones.
- [ ] **Run detection in a Web Worker** (refactor note 3). No UI freeze while finding people.
- [ ] **Kiosk mode:** full screen, large buttons, auto-reset after saving, optional countdown timer for the camera, and a lock so guests can't open settings.
- [ ] **Improve cut-outs for seated or partly hidden people** (as in the car photo). Evaluate MediaPipe's multiclass selfie segmenter (Apache-2.0); it needs `'wasm-unsafe-eval'`, so weigh that against keeping the CSP strict.
- [ ] **End-to-end tests in CI:** Playwright against `dist/`, using CSP-safe polling (no `wait_for_function`). Cover the sample images (single, group of 6, seated), move/resize/erase/undo, save, and the update flow by swapping `version.json`.
- [ ] **Unit tests** for the pure functions (refactor note 8).
- [ ] **Accessibility:** keyboard move/resize for the selected person (arrow keys, +/−), visible focus on the canvas, and live-region announcements for "N people found" and saves.

## P2: product growth

- [ ] **More styles beyond blocks** through a pluggable style layer (refactor note 7): 8-bit pixel, mosaic tiles, comic, cross-stitch.
- [ ] **More worlds**, and a picker that previews the world behind the current photo.
- [ ] **Event branding:** an optional logo or event name strip on prints, set by a URL parameter or a small config file.
- [ ] **Direct printing guidance** for other printers (Print Then Cut on Cricut Explore/Maker, standard 4 × 6 photo printers).
- [ ] **Custom domain and security headers.** Front Pages with a CDN that can set HSTS, `frame-ancestors`, `Permissions-Policy: camera=(self)` and `X-Content-Type-Options`.
- [ ] **Clean up the Claude-artifact leftovers** (refactor note 5) and **split into modules** (refactor note 1).
- [ ] **Generate world thumbnails at build time** (refactor note 4).
- [ ] **Name the tuning constants** (refactor note 6).

## Done

- [x] Diagnostics panel (`?debug=1`): build, detection status and timings, photo size, device memory, WebGL renderer, tf.js memory, errors; copyable report. Device and test-print script in [DEVICE-TEST.md](DEVICE-TEST.md)
- [x] Cut people out of real photos (MoveNet MultiPose + MediaPipe Selfie Segmentation), including groups and people at the edges
- [x] 3D block worlds: Plains, Village, Mountains, Snowy taiga, Desert, Beach sunset, Nether (crimson forest, portal, lava sea), End (city, pillars, exit portal)
- [x] Move, resize (handles, pinch, wheel, slider), erase, erase area, restore, undo/redo
- [x] StickerPix sizing: stickers per sheet, custom width, 4 × 6 photo, 300 dpi PNGs, block-list CSV
- [x] Hashed assets, self-update without hard refresh, strict CSP, SRI, self-hosted dependencies
- [x] CI build/verify/deploy to GitHub Pages with pinned actions and least privilege; Dependabot
