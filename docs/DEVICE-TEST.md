# Device and test-print script

Run this before the first event, and again on any new phone or tablet. It covers three roadmap P0 items: real-device testing, the StickerPix test print, and the Design Space workflow, plus touch checks for group move and box edges. Allow about 100 minutes, most of it printing.

Use the live Pages URL, not a local build. Add `?debug=1` to show the diagnostics panel:

```
https://ahsenbaig-boilerplate.github.io/PosePop/?debug=1
```

## The diagnostics panel

The panel sits in the top-right corner. **Diagnostics** collapses it to one button, so it can stay open while you use the app. **Copy** puts a text report on the clipboard so you can paste it into the results table or an issue. The report contains no photos or file names. Nothing in the panel is sent anywhere.

| Section | What it tells you |
|---|---|
| Build | The build this page is running, and the newest build on the server at the last update check. If the two differ, an update is waiting. |
| Device | Browser, screen and viewport, device memory and CPU cores (Chrome only; Safari doesn't report them), and the GPU with its WebGL version and maximum texture size. |
| Detection | Time to load tf.js and each model, the tf.js backend, how much was downloaded, and how long after page start detection was ready. "cached" means nothing was downloaded. |
| Photo | File type and size, original and working size, decode time, detections before and after merging duplicates, find and cut-out times, and the block grid with its render time. |
| Print | Printed size and pixels, and for sticker sheets the copies per sheet, grid, and the margin and gap estimates in use. |
| Memory | tf.js tensors and bytes, refreshed every 2 s. Also the JS heap, in Chrome only. |
| Errors | The last load, decode or detection error, and any uncaught script error. |

**Red flags:** the backend isn't `webgl`, the Errors section has entries, the tensor count keeps rising from one photo to the next, or detection takes more than 10 s.

## Before you start

- Charge each device to at least 80 % and turn off low-power mode, since it slows the GPU.
- Prepare three test photos and put them on each device:
  1. **Single:** one person standing, full body.
  2. **Group of 6:** six people side by side, with someone at each edge of the frame.
  3. **Seated:** one person sitting, for example in a car seat or on a sofa.
- Load the StickerPix with sticker sheets and a 4 × 6 photo sheet. Bring a ruler marked in 1/32 in or 0.5 mm.
- Write down the build id shown on the panel. Every result belongs to that build.

## Part A: Android Chrome

1. Open the URL with `?debug=1` on Wi-Fi.
   *Expect:* the panel appears and **Detection → status** reaches `ready`. Record **ready after**, **downloaded** and **backend**. The backend should be `webgl 2` or `webgl 1`.
2. Reload the page.
   *Expect:* **downloaded** shows `(cached)` and **ready after** drops a lot.
3. Tap **Take photo**.
   *Expect:* the camera opens directly, not a file picker or permission error. (The old Claude-hosted copy failed at this step.) Take a photo of one person.
   *Expect:* "1 person found". Record **find people**, **cut out** and **blocks**.
4. **Choose image** → Group of 6.
   *Expect:* 6 people found. If not, record the **detections** line (raw → merged → after crowd filter), which shows the stage where people were lost.
5. **Choose image** → Seated. Record the people found and how good the cut-out looks, rated 1–5. This photo is the baseline for the P1 item on seated people.
6. Edit: drag the group, resize it by a corner handle and by pinching, erase a patch, then undo and redo. Part F covers moving people one by one and adjusting boxes.
   *Expect:* while people are found, the busy badge counts the steps ("Finding people (pass 2 of 4)…") and the page keeps responding: you can scroll and tap the world picker. A short freeze remains at "Placing blocks…"; record how long it lasts. Check **Detection → runs in** on the panel: it should say Web Worker, or explain why not.
7. Save a sticker PNG, then a full sheet.
   *Expect:* the files land in Downloads with names starting `posepop-`.
8. **Memory soak:** load 10 photos in a row (use the camera, or alternate the test photos). After each one, note **tf.js tensors**.
   *Expect:* the count returns to about the same number every time. A steady climb is a leak; copy the report and file it.
9. Rotate the phone to landscape and back.
   *Expect:* the layout fits, nothing is cut off, and **screen** updates.
10. Tap **Copy** and paste the report into the results table.

## Part B: iOS Safari

Repeat Part A, watching for these Safari differences:

- **Device → memory** and **Memory → JS heap** show "not reported". That is normal on Safari.
- In step 3, iOS may offer a menu (Take Photo / Photo Library / Choose File). Choose **Take Photo**.
- If a photo from the library fails with a HEIC message, set **Settings → Camera → Formats → Most Compatible** and try again. Record whether it happened.
- In step 7, Safari shows a download prompt or opens the PNG in a new tab. Record which happened, and whether **Save to Files** or **Save Image** works.
- In step 8, iOS kills tabs that use too much memory. If the page reloads by itself during the soak, record after how many photos.

## Part C: tablet

On the tablet planned for the event, run steps 1, 3, 4, 6, 8 and 9 of Part A in both orientations. Hold it as a guest would and check that the buttons are easy to reach.

## Part D: StickerPix test print (2-, 4- and 8-up)

### Why this test matters

Design Space lays out the copies itself. PosePop only decides how wide each sticker is so that N copies fit on one sheet, using two estimates in `SHEET` in `src/index.html`: a 0.15 in margin to the sheet edge and a 0.12 in gap between stickers. If the real values are larger, Design Space pushes the last copies onto a second sheet. If they are smaller, every sticker could be bigger.

### Setup

Use the Group of 6 photo and the **Plains** world, with the **Thin** border. With a world behind the people the sticker is a plain rectangle, which is the easiest shape to measure. Keep the same photo for all three sheets.

### Steps, for each of 2, 4 and 8 per sheet

1. Under **Stickers per sheet**, choose the count. Record **Print → piece** (the width and height in inches) and **Print → sheet** (grid and rotation).
2. Tap **Save full sheet** as well. It shows PosePop's intended layout to compare with Design Space's.
3. **Save sticker PNG** and upload it to a new StickerPix Print + Cut project in Design Space.
4. Check the size Design Space imports it at. The PNG is tagged at 300 dpi. If Design Space ignores that tag, the image arrives at a different size. Either way, set the width to the value from step 1 with the size lock on, and record what it imported at.
5. Set the project quantity to the count.
   *Expect:* all copies fit on **one** sheet. If Design Space needs a second sheet, record how many fit on the first.
6. Compare Design Space's layout with the saved full-sheet PNG. Design Space may not rotate images; the 2-up of a portrait photo relies on rotation.
7. Print and cut, then measure:
   - sticker width and height (should be within ±0.02 in of step 1)
   - the smallest margin from a sticker to the sheet edge
   - the smallest gap between two stickers
   - how far the cut line is offset from the white border, and in which direction

### Reference sizes from the current estimates

Use these to check that step 1 looks right. The ratio is width ÷ height of the composed picture.

| Picture | 2-up | 4-up | 8-up |
|---|---|---|---|
| Landscape 4:3 | 3.64 × 2.73 in | 2.34 × 1.75 in | 1.76 × 1.32 in |
| Square | 3.63 × 3.63 in | 1.76 × 1.76 in | 1.75 × 1.75 in |
| Portrait 3:4 | 2.73 × 3.64 in, rotated | 1.76 × 2.35 in | 1.32 × 1.76 in, rotated |

Square 4-up and 8-up come out almost the same size, because both use two columns. That's expected with the current layout rule.

### Interpreting the results

- Something spilled onto a second sheet → set `SHEET.margin` and `SHEET.gap` to the smallest margin and gap Design Space used (step 7), then reprint that count.
- Everything fitted with room to spare → lower the estimates halfway towards the measured values; don't go below them.
- Size off by more than ±0.02 in → check the dpi or import step before changing anything in PosePop.
- The cut is offset → run Design Space's print-then-cut calibration first. PosePop can't correct this.

## Part E: Design Space workflow

1. Choose the **Cut-out** world, so there's no background, with the Thin border. Save the sticker PNG, upload it, print 2 and cut.
   *Expect:* the kiss-cut follows the white outline around the people, not a rectangle.
2. Switch to **4 × 6 photo**, choose a world, save, and print on a photo sheet.
   *Expect:* the image fills the sheet with no white edges, and the people aren't cropped.

## Part F: group move and box edges (touch)

Run this on each phone and the tablet with the Group of 6 photo and the **Plains** world. Use fingers only, no stylus. These touch gestures have only been tested with a mouse so far.

1. Under **Edit the picture**, check that **Move** and **Move group** are selected.
   *Expect:* the dashed frame wraps all six people, and the Size label reads "Size of group".
2. Drag anyone with one finger.
   *Expect:* all six move together, and nobody is left behind or drifts apart.
3. Pinch with two fingers on the picture, then drag a corner handle.
   *Expect:* the group grows and shrinks around its bottom centre, so feet stay on the ground line. The page itself doesn't zoom.
4. Tap **Move each**, then drag the person at the left end.
   *Expect:* only that person moves, and the frame wraps only them. Look for an arm or shoulder that moves with the wrong person; that is what step 6 fixes.
5. Tap **Undo** twice.
   *Expect:* everyone is back where they started.
6. Tap **Adjust boxes**.
   *Expect:* everyone returns to where they stood in the photo, each tinted in a different colour, with numbered boxes.
   - Tap inside a box. *Expect:* it becomes the solid, selected box with four white edge handles.
   - Drag an edge handle across a neighbour's arm. *Expect:* the arm changes to this person's colour as you drag.
   - Drag the edge on the line itself, not the handle. *Expect:* it's still easy to grab without hitting the neighbouring box by mistake. Record if it isn't.
   - Drag a top edge down into the background above someone's head. *Expect:* stray blocks above the line disappear (cropped).
7. Tap **Move each** and drag the person whose box you changed.
   *Expect:* the arm now moves with its owner.
8. Tap **Reset boxes**, then **Undo**.
   *Expect:* Reset puts the original split back, and Undo brings your edges back.
9. Save a sticker PNG.
   *Expect:* the saved file has no box tint, lines or handles.
10. Load a single-person photo.
    *Expect:* **Move each** isn't offered, but **Move group** and **Adjust boxes** are.

## Part G: offline

1. On Wi-Fi, open the app and wait until the footer says **works offline** (shortly after person detection is ready).
2. Turn on airplane mode and reload.
   *Expect:* the app opens, the footer says **offline · works offline**, and person detection becomes ready.
3. Still offline, take a photo, then save a sticker.
   *Expect:* people are found and the PNG saves, exactly as online.
4. Turn airplane mode off, then reload.
   *Expect:* the footer goes back to **up to date**.

## Part H: kiosk mode

Use the event tablet, and set up Guided Access (iPad) or App pinning (Android) first.

1. Open the URL with `?kiosk=1` added.
   *Expect:* a "Tap to start" screen.
2. Tap it.
   *Expect:* the browser goes full screen (not on iPhone), asks once for camera permission, and shows a live, mirrored preview.
3. Tap **Take photo**.
   *Expect:* a 3-2-1 countdown and a flash. The photo isn't mirrored, people are found, and the screen shows the picture, the worlds, and **Retake** / **Save**.
4. Try **Switch camera**, then **Retake**.
5. Tap **Save**.
   *Expect:* the PNG saves, and "Starting over for the next guest in 60 s" appears. Tap the picture: the count goes back to 60.
6. Leave it alone.
   *Expect:* after 60 s it returns to the start screen and the guest's photo is gone.
7. Long-press the PosePop title for 1.5 s.
   *Expect:* all settings appear. Long-press again to hide them.
8. Leave the tablet for 10 minutes.
   *Expect:* the screen stays on (`?kiosk=1&debug=1` shows "wake lock: on").
9. Repeat steps 3 and 5 in the other orientation.
10. On a phone, deny camera permission, then tap **Take photo**.
    *Expect:* the phone's own camera opens.

## Results

Copy this table for each device and fill it in. Paste each device's **Copy** report underneath.

| Check | Android | iOS | Tablet |
|---|---|---|---|
| Build id | | | |
| Runs in (worker or page) / backend / ready after (first load, then cached) | | | |
| Camera opens directly | | | |
| Single / group of 6 / seated: people found | | | |
| Find + cut-out time (group of 6) | | | |
| UI freeze length | | | |
| Save works / where the file goes | | | |
| Tensors after photo 1 → photo 10 | | | |
| Both orientations OK | | | |
| Group drag and pinch move everyone together (F2–F3) | | | |
| Box edge easy to grab with a finger (F6) | | | |
| Arm follows its owner after a box edit (F7) | | | |
| Saved PNG free of box overlay (F9) | | | |
| Opens and finds people in airplane mode (G2–G3) | | | |
| Kiosk: countdown, save, 60 s reset, long-press, screen stays on (H) | | | |

| Sheet | Piece (app) | Imported at | Fitted on one sheet | Measured size | Min margin | Min gap | Cut offset |
|---|---|---|---|---|---|---|---|
| 2-up | | | | | | | |
| 4-up | | | | | | | |
| 8-up | | | | | | | |
