# PosePop

Strike a pose, pop into a world. PosePop finds the people in a photo, rebuilds them in blocks, drops them into a 3D block world, and sizes the result as stickers or a 4 × 6 photo for the Cricut StickerPix Print + Cut. It runs entirely in the browser on phones, tablets and PCs, and is built for events and home use.

**Live:** https://ahsenbaig-boilerplate.github.io/PosePop/

Photos never leave the device: detection, cut-out and rendering all run locally.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how it works, the build, and refactor notes
- [docs/ROADMAP.md](docs/ROADMAP.md): to-dos by priority
- [docs/DEVICE-TEST.md](docs/DEVICE-TEST.md): real-device and StickerPix test-print script (uses `?debug=1`)
- [SECURITY.md](SECURITY.md): reporting and accepted risks

## Develop

```sh
npm ci --ignore-scripts
npm start          # build and preview on http://localhost:8080
npm test           # build + release gate (what CI runs)
```

Edit `src/index.html`. Reference any bundled file as `__ASSET:<path>__` and its integrity hash as `__SRI:<path>__`; the build fills them in. Add new files to the `ASSETS` list in `scripts/build.mjs`.

## How it ships

Pushes to `main` run `.github/workflows/pages.yml`: install from the lockfile, audit, build, verify, then deploy to GitHub Pages with the official Pages actions. Pull requests run the same build and checks without deploying.

### Caching and updates

Nobody ever needs a hard refresh.

- Every library, font and model file is published under a content-hashed name (`tf.min.300dfae273d2.js`), so it can be cached indefinitely and a new version is a new URL.
- Only `index.html` and `version.json` can go stale. Each build stamps a build id into both.
- The page checks `version.json` (with `cache: "no-store"` and a timestamp query) a few seconds after load, every 5 minutes, when the tab becomes visible again, and when the device comes back online.
- If a newer build exists and nobody has loaded a photo yet, the page moves to `?v=<build>`, a URL no cache has seen, so it always gets the new HTML. If someone is mid-edit, it shows an "Update ready" bar instead and never interrupts their work. A guard prevents reload loops if a CDN edge is still serving the old page.

### Security

- No third-party requests at runtime. three.js, TensorFlow.js, fonts and models are self-hosted from pinned npm packages (`package-lock.json` integrity hashes) and served same-origin.
- Strict Content-Security-Policy generated at build time: `default-src 'none'`, no `unsafe-inline`, no `unsafe-eval`, inline script and style allowed only by SHA-256 hash, `connect-src 'self'`.
- Subresource Integrity (SHA-384) on every script.
- `referrer: no-referrer`.
- CI actions pinned to full commit SHAs; workflow token is read-only except the deploy job (`pages: write`, `id-token: write`); `npm ci --ignore-scripts`; Dependabot keeps actions and packages current.
- `scripts/verify.mjs` fails the build if any of the above regresses (missing SRI, external references, inline handlers, CSP drift, unreferenced or tampered assets).

GitHub Pages cannot set response headers, so `frame-ancestors`, HSTS and similar header-only controls are not available. Host behind a CDN that sets them if you need those.

See [SECURITY.md](SECURITY.md) for known accepted risks and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for component licences.

## Third-party components

| Component | Licence |
|---|---|
| three.js 0.128.0 | MIT |
| TensorFlow.js 4.22.0 | Apache-2.0 |
| MediaPipe Selfie Segmentation model | Apache-2.0 |
| MoveNet MultiPose model | Apache-2.0 |
| Pixelify Sans, IBM Plex Sans, IBM Plex Mono (via Fontsource) | SIL OFL 1.1 |

Block textures are drawn in code. Not an official Minecraft product; not approved by or associated with Mojang or Microsoft.
