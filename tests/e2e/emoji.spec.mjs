// Emoji on the picture: add, select, drag, turn and resize with the handle, keys, undo, remove, and the kiosk guest view.
// Uses the built-in sample, so no detection is needed.
import { test, expect, openTab } from "./fixtures.mjs";

const snap = page => page.evaluate(() => window.posepopState());
async function ready(page) {
  await page.goto("?debug=1");
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await openTab(page, "emoji");
}
// a point on the preview, from fractions of the canvas
async function at(page, fx, fy) {
  const r = await page.locator("#out").boundingBox();
  return [r.x + r.width * fx, r.y + r.height * fy];
}
async function drag(page, [x, y], [dx, dy]) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + dx * i / 10, y + dy * i / 10);
  await page.mouse.up();
}

test("tapping an emoji adds it selected; drag moves it, and undo puts it back", async ({ page }) => {
  await ready(page);
  await page.click('#decoPick [aria-label="Add crown"]');
  await expect.poll(async () => (await snap(page)).deco.map(d => d.name)).toEqual(["crown"]);
  expect((await snap(page)).decoSel).toBe(0);
  await expect(page.locator("#decoEdit")).toBeVisible();
  await expect(page.locator("#decoName")).toHaveText("crown");
  await expect(page.locator("#out")).toHaveAttribute("aria-label", /, with 1 emoji$/);
  const before = (await snap(page)).deco[0];
  await drag(page, await at(page, before.x, before.y), [80, 40]);
  await expect.poll(async () => (await snap(page)).deco[0].x).toBeGreaterThan(before.x);
  expect((await snap(page)).deco[0].y).toBeGreaterThan(before.y);
  expect((await snap(page)).group, "the people stay put").toEqual({ dx: 0, dy: 0, s: 1 });
  await page.click("#undo");
  await expect.poll(async () => (await snap(page)).deco[0]).toEqual(before);
  await page.click("#undo"); // and before that, there was no emoji
  await expect.poll(async () => (await snap(page)).deco).toEqual([]);
});

test("the round handle resizes and turns; the sliders and remove act on the selected one", async ({ page }) => {
  await ready(page);
  await page.click('#decoPick [aria-label="Add red heart"]');
  await expect.poll(async () => (await snap(page)).deco.length).toBe(1);
  const d = (await snap(page)).deco[0], r = await page.locator("#out").boundingBox();
  // the handle sits just outside the frame's lower-right corner
  const m = Math.min(r.width, r.height), half = d.s * m / 2 + 8;
  const [cx, cy] = await at(page, d.x, d.y);
  await drag(page, [cx + half, cy + half], [30, -40]);
  const e = (await snap(page)).deco[0];
  expect(e.r, "turned").toBeLessThan(-0.2);
  expect(e.s, "and resized").not.toBeCloseTo(d.s, 2);
  await page.locator("#decoSize").fill("50");
  await expect.poll(async () => (await snap(page)).deco[0].s).toBeCloseTo(0.5, 5);
  await expect(page.locator("#decoSizeRead")).toHaveText("50%");
  await page.locator("#decoTurn").fill("90");
  await expect.poll(async () => (await snap(page)).deco[0].r).toBeCloseTo(Math.PI / 2, 5);
  await page.click("#decoRemove");
  await expect.poll(async () => (await snap(page)).deco).toEqual([]);
  await expect(page.locator("#decoEdit")).toBeHidden();
});

test("tapping the picture away from an emoji deselects it; tapping it selects it again", async ({ page }) => {
  await ready(page);
  await page.click('#decoPick [aria-label="Add star"]');
  await expect.poll(async () => (await snap(page)).decoSel).toBe(0);
  const d = (await snap(page)).deco[0];
  await page.mouse.click(...await at(page, 0.04, 0.96));
  await expect.poll(async () => (await snap(page)).decoSel).toBe(-1);
  await expect(page.locator("#decoEdit")).toBeHidden();
  await page.mouse.click(...await at(page, d.x, d.y));
  await expect.poll(async () => (await snap(page)).decoSel).toBe(0);
});

test("keys move, resize, turn and remove the selected emoji, announced, as one undo step per burst", async ({ page }) => {
  await ready(page);
  await page.click('#decoPick [aria-label="Add balloon"]');
  await expect.poll(async () => (await snap(page)).deco.length).toBe(1);
  const d = (await snap(page)).deco[0];
  await page.locator("#out").focus();
  await expect(page.locator("#hover")).toHaveText(/^Keys: arrows move the emoji/);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(page.locator("#announce")).toHaveText("Emoji moved");
  const e = (await snap(page)).deco[0];
  expect(e.x).toBeGreaterThan(d.x);
  expect(e.y).toBeGreaterThan(d.y);
  await page.keyboard.press("]");
  await expect(page.locator("#announce")).toHaveText("Turned to 15 degrees");
  await page.keyboard.press("+");
  await expect(page.locator("#announce")).toHaveText(/^Size \d+ percent$/);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snap(page)).decoSel).toBe(-1);
  // two bursts (the moves, announced once they ended, then the turn and resize): two undo steps
  await page.click("#undo");
  await expect.poll(async () => (await snap(page)).deco[0]).toEqual(e);
  await page.click("#undo");
  await expect.poll(async () => (await snap(page)).deco[0]).toEqual(d);
  await page.click('#decoPick [aria-label="Add balloon"]');
  await page.locator("#out").focus();
  await page.keyboard.press("Delete");
  await expect.poll(async () => (await snap(page)).deco.length).toBe(1);
  await expect(page.locator("#announce")).toHaveText("balloon removed");
});

test("Remove all clears every emoji", async ({ page }) => {
  await ready(page);
  for (const n of ["crown", "sparkles", "rainbow"]) await page.click(`#decoPick [aria-label="Add ${n}"]`);
  await expect.poll(async () => (await snap(page)).deco.length).toBe(3);
  await page.click("#decoClear");
  await expect.poll(async () => (await snap(page)).deco).toEqual([]);
  await expect(page.locator("#decoClear")).toBeHidden();
});

test("kiosk guests can add emoji too", async ({ page }) => {
  await page.goto("?kiosk=1");
  await page.click("#kGo");
  await page.click("#kBack");
  await expect(page.locator("#decoPick")).toBeVisible();
  await page.click('#decoPick [aria-label="Add party popper"]');
  await expect(page.locator("#out")).toHaveAttribute("aria-label", /, with 1 emoji$/);
});

test("adding an emoji while erasing switches to Move, so its handles work", async ({ page }) => {
  await ready(page);
  await page.click("#tab-edit");
  await page.click("#tool [data-v=erase]");
  await page.click("#tab-emoji");
  await page.click('#decoPick [aria-label="Add crown"]');
  await expect(page.locator("#tool [data-v=move]")).toHaveAttribute("aria-pressed", "true");
  const d = (await snap(page)).deco[0], r = await page.locator("#out").boundingBox();
  const half = d.s * Math.min(r.width, r.height) / 2 + 8, [cx, cy] = await at(page, d.x, d.y);
  await drag(page, [cx + half, cy + half], [30, 30]);
  expect((await snap(page)).deco[0].s, "the handle resized it").toBeGreaterThan(d.s);
  expect((await snap(page)).fixes, "and nothing was erased").toBe(0);
});
