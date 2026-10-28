# Changelog

Versions follow [semantic versioning](https://semver.org): **major** for changes that break saved settings or the print workflow, **minor** for new features, **patch** for fixes. Each release is a signed `v<version>` tag and stays published at `/PosePop/v/<version>/`. See "Releasing" in the README.

## 1.8.0 (27 October 2026)

- **Emoji on the picture:** the new **Emoji** tab puts emoji stickers on top of the picture: party poppers, crowns, hearts, stars and 47 more. Tap one to add it, drag it to move it, drag its round handle to resize and turn it, or tap its × to remove it. **Size**, **Turn**, **Bring to front** and **Remove all** are in the tab, and Undo covers every change. They print sharp at 300 dpi with every style and world, and on a cut-out sticker the white cut border goes around them too. Kiosk guests can add them as well. A new photo starts without emoji.
- **Easier handles on phones:** the resize handles on the picture now have the same size on screen whatever the picture's size, and are bigger on touch screens.

## 1.7.0 (27 October 2026)

- **The picture stays in view:** the picture and the sheet preview now stay on screen while you change settings, so every change shows straight away without scrolling back up. On a phone the picture pins to the top, with a small sheet beside it, and the settings scroll underneath. Settings are grouped into four tabs: **Style**, **World**, **Edit** and **Print**. Less-used options (dithering, 3D edges, shadow, zoom and the grid) are under **More options**, and **Undo**, **Redo**, **Hold to compare** and **Save sticker** sit right under the picture. Kiosk guests still see the styles and worlds, without the tabs.

## 1.6.0 (27 October 2026)

- **Keyboard and screen reader support:** press Tab once and choose "Skip to the picture". Then arrow keys move the group (hold Shift for bigger steps), + and − resize, and in Move each, [ and ] choose a person. Undo works as with a drag. Screen readers now hear how many people were found, when a sticker is saved, and each move, resize and undo, and the picture's description matches what it shows.

## 1.5.3 (27 October 2026)

- **More checks under the hood:** the colour matching, block clustering, dithering, green-screen detection and 3D world sizing now have their own tests, checked against published reference values. Nothing changes in how the app looks or works.

## 1.5.2 (26 October 2026)

- **Tested before every release:** each change now runs automated browser tests on sample photos before it can go live. The tests find people, move, resize, erase, undo, save a 300 dpi sticker, update to a newer version and work offline. Nothing changes in how the app looks or works.

## 1.5.1 (26 October 2026)

- **Faster with 3D worlds:** changing the detail, crop or border no longer redraws the 3D world. Each world is rendered once per size range and cropped to fit, so the "Placing blocks" pause with a world went from 1.2–10.2 s to 0.13–0.34 s in testing. The look is unchanged.

## 1.5.0 (26 October 2026)

- **Release notes in the app:** the Version picker shows each version's headline (for example "1.4.0 · 26 October 2026 — Green or blue screen"), and **What's new** next to it lists what changed in every version, with the one you're on highlighted. The notes come from this changelog.

## 1.4.0 (26 October 2026)

- **Green or blue screen:** with "Green or blue screen behind people" on (Photo panel), the cut-out comes from keying out the screen colour, not the person detector. That gives sharp, complete cut-outs, including legs, seated people and unusual poses. The screen colour is found in each photo. Detection still finds and separates people, and anything outside their boxes is dropped. Screen-coloured fringes are removed, and **Screen removal** (1–10) tunes how much near-screen colour goes. If the people match the screen colour (clothes), a warning says so. No green or blue screen in the photo: the detector's cut-out is used as before.

## 1.3.0 (26 October 2026)

- **Emoji style:** a mosaic of 73 Google Noto Emoji (Apache-2.0, nothing printed on stickers), in three palette groups: Colors, Food & nature, Faces & animals. Skin is drawn from raised hands in 5 skin tones and plain hearts and squares: animals and foods in the skin-tone range, and emoji with double meanings, are left out on purpose. The images load the first time the style is picked, and work offline.
- **Internal:** the app's code moved out of `index.html` into `src/app/*.js`, joined by the build into one cached, SRI-checked `app.js`. The page is smaller, the code is cached between deploys, and the CSP no longer needs a script hash (`script-src 'self'`). No change in behaviour.

## 1.2.0 (24 October 2026)

- **Photo style:** the people as the real photo, background removed and no blocks, on any background. With **Original photo** behind them and nobody moved, it shows the original photo. Moving, resizing, boxes, erasing and print work as in the other styles. The Cut-out sticker's white border follows the photo's outline.
- **New backgrounds:** **Original photo** (the photo's own background, lined up with the people), **Color** (8 swatches or any colour), and **Your image** (operator only in kiosk mode; stays on the device). They work with every style.

## 1.1.0 (24 October 2026)

- **Versions:** a version picker in the footer (operator view in kiosk mode) lists Latest and every release. Releases stay published at `/v/<version>/` and never auto-update, so an event can pin a known-good build. The footer shows the version, for example "1.1.0", or "1.1.0+abc1234" for a build of `main` between releases.
- **Offline:** each version has its own cache, so switching versions doesn't empty another version's offline copy.
- **Clean look:** stray single cells are removed, and `?debug=1` gains a colour-error figure.

## 1.0.0 (24 October 2026)

The first production event build (`65c125a-e5f984fcb878`). Person detection in a Web Worker, kiosk mode, offline support, group move and box edges, Blocks and Retro pixel styles, the Clean look, diagnostics (`?debug=1`), and StickerPix print sizing.
