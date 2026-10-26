# PosePop

Strike a pose, pop into a world. PosePop finds the people in a photo, rebuilds them in blocks, drops them into a 3D block world, and sizes the result as stickers or a 4 × 6 photo for the Cricut StickerPix Print + Cut. It runs entirely in the browser on phones, tablets and PCs, and is built for events and home use.

**Live:** https://ahsenbaig-boilerplate.github.io/PosePop/

Photos never leave the device: detection, cut-out and rendering all run locally.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how it works, the build, and refactor notes
- [docs/ROADMAP.md](docs/ROADMAP.md): to-dos by priority
- [docs/EVENT-RUNBOOK.md](docs/EVENT-RUNBOOK.md): running PosePop at an event (setup, troubleshooting, rollback)
- [docs/DEVICE-TEST.md](docs/DEVICE-TEST.md): real-device and StickerPix test-print script (uses `?debug=1`)
- [SECURITY.md](SECURITY.md): reporting and accepted risks

## Kiosk mode

Add `?kiosk=1` to the URL for events: a start screen, a live camera with a 3-2-1 countdown, big Retake and Save buttons, and a reset for the next guest 60 s after a save. Long-press the PosePop title for 1.5 s to show the settings. Lock the device to the browser with Guided Access (iOS) or App pinning (Android). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#kiosk-mode-kiosk1).

## Releasing

1. In a PR, bump `version` in `package.json` and add a `## <version> (<date>)` section to `CHANGELOG.md`. Start each bullet with a **bold headline:**; the first one becomes the version's headline in the app's picker, and all of them appear under **What's new**. Merge it.
2. Tag that commit with a signed tag and push the tag: `git tag -s v1.2.0 -m "PosePop 1.2.0"`, then `git push origin v1.2.0`.
3. Deploy: `gh workflow run "Build and deploy" --ref main`. Pages only accepts deploys from `main`, so a tag push doesn't deploy by itself. Every deploy also rebuilds all `v*` tags.
4. The release is now at `/PosePop/v/1.2.0/` and in the Version picker. Optionally, add release notes with `gh release create v1.2.0 --notes-file …`.

To use a release at an event, pick it in the footer's **Version** picker, or open `/PosePop/v/<version>/?kiosk=1`. It won't change until you pick another version.

## Develop

```sh
npm ci --ignore-scripts
npm start          # build and preview on http://localhost:8080
npm test           # build + release gate + unit tests (what CI runs)
npm run test:e2e   # Playwright end-to-end tests against dist/ (after npm test; first run: npx playwright install chromium)
npm run releases   # also build every v* tag into dist/v/<version>/ (slow: npm ci per tag)
```

Edit the app in `src/app/*.js`, one file per section, joined in file-name order into one hashed `app.js` by the build, and the markup and styles in `src/index.html`. Reference any bundled file as `__ASSET:<path>__` and its integrity hash as `__SRI:<path>__`; the build fills them in. Add new files to the `ASSETS` list in `scripts/build.mjs`.

## How it ships

Pushes to `main` run `.github/workflows/pages.yml`: install from the lockfile, audit, build, verify and run the unit tests; in a second job, run the Playwright end-to-end tests; then, once both pass, deploy to GitHub Pages with the official Pages actions. Pull requests run the same build and tests without deploying.

### Caching and updates

Nobody ever needs a hard refresh.

The footer shows which version is running, when it was built, and whether it's up to date, so you can confirm a deploy reached a device.

- Every library, font and model file is published under a content-hashed name (`tf.min.300dfae273d2.js`), so it can be cached indefinitely and a new version is a new URL.
- Only `index.html` and `version.json` can go stale. Each build stamps a build id into both.
- The page checks `version.json` (with `cache: "no-store"` and a timestamp query) a few seconds after load, every 5 minutes, when the tab becomes visible again, and when the device comes back online.
- If a newer build exists and nobody has loaded a photo yet, the page moves to `?v=<build>`, a URL no cache has seen, so it always gets the new HTML. If someone is mid-edit, it shows an "Update ready" bar instead and never interrupts their work. A guard prevents reload loops if a CDN edge is still serving the old page.
- A service worker keeps the current build cached for offline use at events: the page always comes from the network when there is one, and hashed files come from the cache. The footer says "works offline" once the build is cached. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#offline-service-worker).

### Security

- No third-party requests at runtime. three.js, TensorFlow.js, fonts and models are self-hosted from pinned npm packages (`package-lock.json` integrity hashes) and served same-origin.
- Strict Content-Security-Policy generated at build time: `default-src 'none'`, no `unsafe-inline`, no `unsafe-eval`, inline script and style allowed only by SHA-256 hash, `connect-src 'self'`.
- Subresource Integrity (SHA-384) on every script.
- `referrer: no-referrer`.
- CI actions pinned to full commit SHAs; workflow token is read-only except the deploy job (`pages: write`, `id-token: write`); `npm ci --ignore-scripts`; Dependabot keeps actions and packages current.
- `scripts/verify.mjs` fails the build if any of the above regresses (missing SRI, external references, inline handlers, CSP drift, unreferenced or tampered assets).

GitHub Pages cannot set response headers, so `frame-ancestors`, HSTS and similar header-only controls are not available. Host behind a CDN that sets them if you need those.

See [SECURITY.md](SECURITY.md) for known accepted risks and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for component licences.

## Licence

PosePop is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE). The name "PosePop" isn't licensed for use by other products. Bundled components keep their own licences; see the table below and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Third-party components

| Component | Licence |
|---|---|
| three.js 0.128.0 | MIT |
| TensorFlow.js 4.22.0 | Apache-2.0 |
| MediaPipe Selfie Segmentation model | Apache-2.0 |
| MoveNet MultiPose model | Apache-2.0 |
| Pixelify Sans, IBM Plex Sans, IBM Plex Mono (via Fontsource) | SIL OFL 1.1 |

Block textures are drawn in code. Not an official Minecraft product; not approved by or associated with Mojang or Microsoft.
