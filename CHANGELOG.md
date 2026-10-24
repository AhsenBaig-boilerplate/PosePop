# Changelog

Versions follow [semantic versioning](https://semver.org): **major** for changes that break saved settings or the print workflow, **minor** for new features, **patch** for fixes. Each release is a signed `v<version>` tag and stays published at `/PosePop/v/<version>/`. See "Releasing" in the README.

## 1.1.0 (24 October 2026)

- **Versions:** a version picker in the footer (operator view in kiosk mode) lists Latest and every release. Releases stay published at `/v/<version>/` and never auto-update, so an event can pin a known-good build. The footer shows the version, for example "1.1.0", or "1.1.0+abc1234" for a build of `main` between releases.
- **Offline:** each version has its own cache, so switching versions doesn't empty another version's offline copy.
- **Clean look:** stray single cells are removed, and `?debug=1` gains a colour-error figure.

## 1.0.0 (24 October 2026)

The first production event build (`65c125a-e5f984fcb878`). Person detection in a Web Worker, kiosk mode, offline support, group move and box edges, Blocks and Retro pixel styles, the Clean look, diagnostics (`?debug=1`), and StickerPix print sizing.
