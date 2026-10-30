# Changelog

Versions follow [semantic versioning](https://semver.org): **major** for changes that break saved settings or the print workflow, **minor** for new features, **patch** for fixes. Each release is a signed `v<version>` tag and stays published at `/PosePop/v/<version>/`. See "Releasing" in the README.

## 1.13.2 (30 October 2026)

- **Faster Photo brush:** Erase and Restore in the Photo style no longer stutter, most of all on groups. Each person's cut-out is now redrawn only when a stroke changes it, and at the size it's shown, so a stroke on a group of 7 takes about a third of the time it did (and about a seventh with Zoom off on a large photo). Prints are unchanged: a save still gets at least its own resolution.

## 1.13.1 (29 October 2026)

- **Fix, kiosk privacy:** a guest who takes a photo and walks away without saving no longer leaves it on screen for the next person. After 90 seconds with nobody touching the screen, the kiosk now goes back to the start screen and forgets the photo, whether it was saved or not. The same goes for a live camera left open. "Starting over for the next guest" shows for the last 15 seconds, and any tap keeps the guest going. Before, the reset only started after a save.

## 1.13.0 (29 October 2026)

- **Choose an emoji from the keyboard:** with the picture focused, press **E** to choose an emoji already on the picture: the frontmost first, then each one behind it (**Shift+E** goes the other way). Screen readers hear which one, for example "crown selected, 2 of 3". The arrows, + and −, [ and ] and Delete then act on it, and Escape goes back to the people. Before, the keyboard could only reach the emoji just added.

## 1.12.0 (29 October 2026)

- **See what the brush covers:** with **Erase** or **Restore**, a ring the size of the brush now follows the pointer over the picture in place of the crosshair. It's red and dashed for Erase and green and solid for Restore, so it's clear which one is on and exactly what a stroke will take away or bring back. On phones and tablets it shows under your finger while you paint. Moving the **Brush** slider shows the new size in the middle of the picture for a moment.

## 1.11.1 (29 October 2026)

- **Fix, Restore in the Photo style:** restoring a part of a person that the cut-out had made faint or see-through, often the legs, now brings the photo back there in full. Before, Restore only worked where the cut-out had removed the part completely, so faint parts stayed faint.

## 1.11.0 (29 October 2026)

- **Bricks style:** a new **Bricks** style builds the people out of studded plastic bricks, seen from above. There are 33 brick colors in three groups: **Basics**, **Skin & hair** and **Brights** (off at first). The materials list counts the studs of each color, the 1 × 1 to 1 × 8 bricks that build each row and how many 32 × 32 baseplates the design takes. **Save brick list (CSV)** gives, for each color, its studs, its RGB and how many bricks of each length, so you can build it for real.

## 1.10.1 (29 October 2026)

- **Fix, gaps in group cut-outs:** when a person's legs weren't detected (dark trousers on a dark backdrop, say), their cut-out stopped at the waist and left a square gap between the people beside them. Their cut-out now reaches the same floor as their neighbours, unless someone is standing in front of them.

## 1.10.0 (28 October 2026)

- **Cleaner cut-outs:** a second, full-body model (BodyPix, Apache-2.0) now checks each person's cut-out, so chairs, car seats, flags and the smudges between legs no longer get cut out with the people. Hair and edges stay as sharp as before. It runs on devices with graphics acceleration (WebGL), which is nearly all of them; without it the cut-out works as before, because the check would take about 12 seconds per person. The first visit downloads 6.8 MB more, once; after that it works offline as before.
- **Fix, Restore in the Photo style:** restoring part of a person now brings back the photo itself. Before, only its shadow appeared where the cut-out had missed.
- **Fix, emoji handles:** adding an emoji now switches to the **Move** tool, so it can be dragged, resized and turned straight away. Before, if Erase or Restore was on, the emoji had no handles.

## 1.9.0 (28 October 2026)

- **Fuse beads style:** a new **Fuse beads** style makes the people out of round ironing beads, each drawn with its hole. There are 36 bead colors in four groups: **Basics**, **Skin & hair**, **Pastels** and **Neons** (off at first). The materials list counts the beads of each color and how many 29 × 29 pegboards the design takes, and **Save bead list (CSV)** gives the counts, each color's RGB and the pegboard layout, so you can make the real thing.

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
