// Styles: every style draws without errors, and Fuse beads lists its beads and the pegboards they take.
// Uses the built-in sample, so no detection is needed.
import { test, expect, closeDiag, openApp, loadPhoto, openTab } from "./fixtures.mjs";

const snap = page => page.evaluate(() => window.posepopState());
async function ready(page) {
  await page.goto("?debug=1");
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await closeDiag(page);
}
async function pick(page, style) {
  await page.click(`#style button[data-v="${style}"]`);
  await expect(page.locator(`#style button[data-v="${style}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
}

test("every style draws the people", async ({ page }) => {
  await ready(page);
  for (const [style, units] of [["pixel", "pixels"], ["beads", "beads"], ["photo", null], ["emoji", "emoji"], ["blocks", "blocks"]]) {
    await pick(page, style);
    await expect(page.locator("#out")).toHaveAttribute("aria-label", units ? new RegExp(`made of ${units}`) : /cut out of the photo/);
    expect((await snap(page)).filled, style).toBeGreaterThan(100);
  }
});

test("Fuse beads: bead colours, the pegboard count, and a bead list that adds up", async ({ page }) => {
  await ready(page);
  await pick(page, "beads");
  await expect(page.locator("#wRead")).toHaveText(/beads wide$/);
  await expect(page.locator("#setsLabel")).toHaveText("Bead colors");
  await expect(page.locator("#mSum")).toHaveText(/^\d+ colors · [\d,]+ beads · \d+ pegboards? \(29 × 29\)$/);
  const boards = Number((await page.locator("#mSum").textContent()).match(/(\d+) pegboards?/)[1]);
  expect(boards).toBeGreaterThan(0);
  await page.click("#tab-print");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#saveCsv")]);
  expect(download.suggestedFilename()).toBe("posepop-beads.csv");
  const rows = Buffer.concat(await (await download.createReadStream()).toArray()).toString().split("\n").map(r => r.split(","));
  expect(rows[0]).toEqual(["Bead color", "Count", "RGB"]);
  const beads = rows.slice(1).filter(r => /^\d+$/.test(r[1] || "") && !r[0].startsWith("Pegboards"));
  expect(beads.reduce((n, r) => n + Number(r[1]), 0), "the counts add up to every bead in the people").toBe((await snap(page)).filled);
  const peg = rows.find(r => r[0] === "Pegboards 29 × 29");
  expect(peg && Number(peg[1])).toBe(boards);
  expect(peg[2]).toMatch(/^\d+ across × \d+ down$/);
  // Neons are off by default; turning them on keeps the list consistent
  await page.click("#tab-style");
  await page.locator("#sets .chip", { hasText: "Neons" }).click();
  await expect(page.locator("#sets .chip", { hasText: "Neons" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await expect(page.locator("#mSum")).toHaveText(/pegboards? \(29 × 29\)$/);
});

test("Photo: Restore brings back the photo itself, not just a shadow", async ({ page }) => {
  await ready(page);
  await pick(page, "photo");
  await page.click("#tab-world");
  await page.click('.scene[data-k="none"]');
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  // an empty spot inside the picture: the widest see-through gap on the row a third of the way down, away from the edges
  const alphaAt = (fx, fy) => page.evaluate(([fx, fy]) => { const c = document.getElementById("out");
    return c.getContext("2d").getImageData(Math.round(fx * (c.width - 1)), Math.round(fy * (c.height - 1)), 1, 1).data[3]; }, [fx, fy]);
  const gap = await page.evaluate(() => { const c = document.getElementById("out"), y = Math.round(c.height * .33), d = c.getContext("2d").getImageData(0, y, c.width, 1).data;
    let best = [0, 0], run = 0; for (let x = Math.round(c.width * .15); x < c.width * .85; x++) { run = d[x * 4 + 3] === 0 ? run + 1 : 0; if (run > best[1]) best = [x - run / 2, run]; }
    return { x: best[0] / (c.width - 1), y: y / (c.height - 1), width: best[1] }; });
  expect(gap.width, "there is a gap between the people").toBeGreaterThan(20);
  expect(await alphaAt(gap.x, gap.y)).toBe(0);
  await page.click("#tab-edit");
  await page.click("#tool [data-v=keep]");
  const r = await page.locator("#out").boundingBox(), X = r.x + gap.x * r.width, Y = r.y + gap.y * r.height;
  await page.mouse.move(X - 6, Y); await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(X - 6 + i * 2, Y);
  await page.mouse.up();
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await expect.poll(() => alphaAt(gap.x, gap.y), { message: "the restored spot shows the photo" }).toBeGreaterThan(200);
});

test("Photo: Restore brings back a part the detector's mask left faint, in full", async ({ page }) => {
  await openApp(page);
  await loadPhoto(page, "single.jpg");
  await openTab(page, "style");
  await pick(page, "photo");
  await openTab(page, "world");
  await page.click('.scene[data-k="none"]');
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  // a cell that is part of the person but drawn faint, because the detector's soft mask (and the body gate) is unsure there
  const alphaAt = (x, y) => page.evaluate(([x, y]) => document.getElementById("out").getContext("2d").getImageData(x, y, 1, 1).data[3], [x, y]);
  const spot = await page.evaluate(() => { const c = document.getElementById("out"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
      { w, h, ox, oy, cell, kept } = window.posepopState().grid; let best = null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (kept[y * w + x] === "1") {
      const X = Math.round(ox + (x + .5) * cell), Y = Math.round(oy + (y + .5) * cell), a = d[(Y * c.width + X) * 4 + 3];
      if (a < 200 && (!best || a < best.a)) best = { X, Y, a, W: c.width, H: c.height }; }
    return best; });
  expect(spot, "single.jpg has a kept cell the mask draws faint").not.toBeNull();
  const filled = (await page.evaluate(() => window.posepopState())).filled;
  await openTab(page, "edit");
  await page.click("#tool [data-v=keep]");
  await page.locator("#brushSize").fill("1");
  const r = await page.locator("#out").boundingBox(), X = r.x + spot.X / spot.W * r.width, Y = r.y + spot.Y / spot.H * r.height;
  await page.mouse.move(X - 1, Y); await page.mouse.down(); await page.mouse.move(X, Y); await page.mouse.move(X + 1, Y); await page.mouse.up();
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await expect.poll(() => alphaAt(spot.X, spot.Y), { message: `the restored cell is solid photo (it was ${spot.a})` }).toBeGreaterThan(240);
  await page.click("#undo");
  await expect.poll(() => alphaAt(spot.X, spot.Y)).toBe(spot.a);
  expect((await page.evaluate(() => window.posepopState())).filled).toBe(filled);
});
