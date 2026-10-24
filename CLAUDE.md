# PosePop: working agreement for coding agents

Read `docs/ARCHITECTURE.md` and `docs/ROADMAP.md` before changing code.

## Non-negotiables

- **No AI attribution anywhere:** no `Co-Authored-By`, `Claude-Session` or "Generated with" lines in commits, PRs, code comments or docs.
- **Quality bar:** production-grade, security-first (enterprise DevSecOps standard). Explain trade-offs. Don't paper over problems.
- **Never tell users to hard-refresh or clear caches.** Every shipped file must be content-hashed via `__ASSET:` / `__SRI:`, and updates reach users through `version.json` and the `?v=<build>` flow.
- **Keep the CSP strict:** no `'unsafe-inline'`, no `'unsafe-eval'`, no third-party origins. No inline `style="…"` or `on*=` attributes. If a library needs a CSP exception, stop and raise it as a decision.
- **No runtime third-party requests:** dependencies are self-hosted from pinned npm packages (`--save-exact`, lockfile committed).
- **Photos never leave the device.** No analytics, telemetry or uploads.

## Workflow

- `npm ci --ignore-scripts`, then `npm test` (build + `scripts/verify.mjs`) must pass before every commit.
- `npm start` previews `dist/` at http://localhost:8080 with production caching rules.
- Work on a branch and open a PR; `main` deploys to GitHub Pages automatically.
- GitHub Actions must stay pinned to full commit SHAs, with least-privilege `permissions:`.
- For any user-visible change, test at phone width (~400 px) and desktop, in light and dark themes.
- Browser tests: the CSP blocks string eval, so Playwright `wait_for_function` fails. Poll from the test side instead.

## Code map (all in `src/index.html` until the module split)

Textures `tex()` · worlds `makeWorld/buildScene/renderScene` · detection `findPeople/detectIn` · cut-out `segment/selfieMask` · styles `STYLES` (`palette/toCells/drawCell`, picked by `S.style`) via `convert`; Clean look `cleanCells/kmeans` with `LOOK_*` constants (`?sample=photo` and Photo → busyness in `?debug=1` to measure) · mask and edits `personMask` · layout `buildView/compose` · editing (move group/each via `cur()`, resize, erase, box edges `boxHit/dragEdge`, undo) · print `frameSize/sizeForCount/renderSheet` · updates `checkForUpdate` · diagnostics `mark/timed/drawDiag` (shown with `?debug=1`; record new timings with `mark`).

## Product constraints

- Printer: Cricut StickerPix Print + Cut. 300 dpi, sticker sheet 3.94 × 7.68 in, 4 × 6 photo. Designs go through Cricut Design Space.
- Don't use "Minecraft" or Mojang assets in names, UI copy or textures, and likewise no other game, toy or brand names, logos or characters (for example in style names). Textures are drawn in code; third-party art such as an emoji set must be self-hosted under an open licence and listed in `THIRD_PARTY_NOTICES.md`.
