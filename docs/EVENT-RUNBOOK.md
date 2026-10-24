# Event runbook

For running PosePop at an event. The first production event is **24 October 2026**. The app version for it is the build whose id ends in **`e5f984fcb878`**. To see the full id, hover the footer version or open `?debug=1`. The first part of the id is the commit, which changes with any merge, docs included; the part after the dash only changes when the app itself changes.

## The day before

1. **Pin the release you'll test** (see "Pinning a version" below), so later merges to `main` can't change it during the event. Without a pinned release, merges to `main` reach event devices: at once on the start screen, or through the update bar mid-edit.
2. **Check each event device.** Run [DEVICE-TEST.md](DEVICE-TEST.md) on the tablet and phone you'll use. If time is short, do these parts, in this order (about 30 minutes):
   - **Part H**, kiosk mode: the camera countdown, save, the 60 s reset, and the long-press for settings.
   - **Part A, steps 1–4 and 7:** detection is ready, the camera opens, people are found, and the save works.
   - **Part G**, offline: the app opens and finds people in airplane mode.
   - **Part F, steps 1–3:** group move and pinch by touch.
3. **Do a test print.** Use Part D with the sticker count you'll use on the day, plus Part E (the Design Space cut). Write down the sticker width Design Space accepts.
4. **Warm the offline cache.** On good Wi-Fi, open the URL below on every device and wait until the footer says **works offline**.
5. **Prepare each device:**
   - charger, and enough free storage for the saved PNGs
   - **Auto-Lock set to Never** (iPad: Settings → Display & Brightness → Auto-Lock), in case wake lock isn't supported
   - a **Guided Access** passcode chosen (iPad: Settings → Accessibility → Guided Access)

## Pinning a version

From 1.1.0, an event can run a fixed, tested release instead of Latest. **Releases never change by themselves.**

- **In the app:** long-press the title to show the settings, then use the footer's **Version** picker.
- **By URL:** `https://ahsenbaig-boilerplate.github.io/PosePop/v/<version>/?kiosk=1` (for example, `v/1.0.0/`).

Warm the offline cache for the version you'll use: open its URL on good Wi-Fi until the footer says "works offline". To go back to Latest, choose it in the picker. Release 1.0.0 has no picker, so open the site root instead.

## On the day: setup (about 15 minutes)

1. Open **https://ahsenbaig-boilerplate.github.io/PosePop/?kiosk=1&debug=1** once, and check the panel:
   - **Build → build** ends in `e5f984fcb878`.
   - **Detection → runs in** says Web Worker, or explains why not, and **backend** is `webgl`. `cpu` means detection will be slow on this device: use another device if you can.
   - **offline** says "this build is cached", and **wake lock** says "on".
2. Reopen without `&debug=1`: **https://ahsenbaig-boilerplate.github.io/PosePop/?kiosk=1**
3. **Long-press the PosePop title for 1.5 s** to show the settings. Set the world and style, the stickers per sheet (checked in the test print), the border, and **Look: Clean**. Long-press again to hide them.
4. Tap **Tap to start** and allow the camera.
5. **Lock the device to the browser.** iPad: triple-click the top (or Home) button for Guided Access. Android: App pinning, found under Settings → Security; the name varies by phone.

## Getting good pictures

- **Lighting:** light should fall on the guests' faces. Avoid a bright window or lamp behind them.
- **Background:** a plain one helps the cut-out.
- **Framing:** frame people from head to at least the waist, and fill the picture. Faces alone, with no shoulders, often aren't detected, so the cut-out falls back to colour.
- **Groups:** best with 1–6 people. Larger groups work but take longer, and people at the back may be dropped.
- **Seated people** cut out less cleanly. The operator can fix it in the settings with **Erase**, **Restore** or **Adjust boxes**.
- **Detail:** 48–64 blocks wide suits stickers.

## If something goes wrong

| What you see | What to do |
|---|---|
| "Finding people (pass 2 of 4)…" takes over a minute | Wait. It's working, and the page stays usable. If it happens every time, open `?debug=1`: **backend: cpu** means this device has no usable GPU, so switch devices. |
| The camera doesn't open | Camera permission was refused. Allow it in the browser's site settings (Safari: **aA** → Website Settings → Camera), then reload. **Take photo** still works through the phone's own camera. |
| "Person detection couldn't load here" | Reload. The first load needs the internet; after that, offline works. |
| A new version was deployed during the event | Someone merged to `main`. In kiosk mode it applies by itself the next time the app returns to the start screen, with no bar for guests. Outside kiosk mode, a bar offers **Reload now**: tap it between guests. |
| The screen goes to sleep | Set Auto-Lock to Never (wake lock isn't supported on that device). |
| Bad cut-out (missing arm, background left in) | Tap **Retake**, with better light and framing, or fix it in the settings with Erase, Restore or Adjust boxes. |
| One person drags a neighbour's arm along | In the settings: **Move each**, or **Adjust boxes** to give the arm to its owner. |
| A guest got out of the app | Turn on Guided Access or App pinning. |
| The app is broken after a deploy | Roll back (below). |

## Rolling back

GitHub Pages always serves `main`.

1. Find the merge commit that caused the problem: `git log --oneline main`.
2. Run `git revert -m 1 <merge commit>`, then push to `main`. Use a signed commit, as usual.
3. CI deploys in about 2 minutes. Devices pick up the fixed build by themselves: at once if no one is editing, otherwise through the update bar.

A device that is offline keeps running the build it has cached.

## After the event

- Fill in the results table in [DEVICE-TEST.md](DEVICE-TEST.md), and note what went wrong and with which photos.
- Unfreeze `main` and continue the roadmap: Clean-look tuning, the module split, emoji mosaic, chroma key, then Playwright tests.
