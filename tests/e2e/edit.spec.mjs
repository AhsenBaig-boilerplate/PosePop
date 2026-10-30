// Editing a detected group: move, resize, erase, undo and redo, then save the sticker.
import { test, expect, watch, openApp, loadPhoto, state, dragOn, personCentre, openTab } from "./fixtures.mjs";

test.describe.configure({ mode: "serial" });
// one page for the whole file: detecting the group once keeps the suite fast
let page, problems;
test.beforeAll(async ({ browser }, info) => {
  const { baseURL, viewport } = info.project.use;
  page = await browser.newPage({ baseURL, viewport });
  problems = watch(page);
  await openApp(page);
  await loadPhoto(page, "group7.jpg");
  await openTab(page, "edit");
});
test.afterEach(() => { expect(problems, "page errors, console errors or CSP violations").toEqual([]); });
test.afterAll(async () => { await page.close(); });

test("Move group drags everyone together, and undo puts them back", async () => {
  await expect(page.locator("#moveMode [aria-pressed=true]")).toHaveText("Move group");
  const a = await personCentre(page, 0), b = await personCentre(page, 6);
  await dragOn(page, a, [-60, -30]);
  await expect.poll(async () => (await state(page)).group.dx).toBeLessThan(0);
  const a2 = await personCentre(page, 0), b2 = await personCentre(page, 6);
  expect(a2[0]).toBeLessThan(a[0]);
  expect(b2[0] - b[0]).toBeCloseTo(a2[0] - a[0], 2); // the same shift for everyone
  await page.click("#undo");
  await expect.poll(async () => (await state(page)).group).toEqual({ dx: 0, dy: 0, s: 1 });
  await page.click("#redo");
  await expect.poll(async () => (await state(page)).group.dx).toBeLessThan(0);
  await page.click("#undo");
});

test("Move each drags one person only", async () => {
  await page.click("#moveMode [data-v=each]");
  const a = await personCentre(page, 0), b = await personCentre(page, 6);
  await dragOn(page, a, [-60, -30]);
  await expect.poll(async () => (await personCentre(page, 0))[0]).toBeLessThan(a[0]);
  expect(await personCentre(page, 6)).toEqual(b);
  await page.keyboard.press("Control+z");
  await expect.poll(() => personCentre(page, 0)).toEqual(a);
  await page.click("#moveMode [data-v=group]");
});

test("Size resizes the group", async () => {
  await expect(page.locator("#sizeLabel")).toHaveText("Size of group");
  await page.locator("#scale").fill("80");
  await expect(page.locator("#sizeRead")).toHaveText("80%");
  await expect.poll(async () => (await state(page)).group.s).toBe(0.8);
  await page.click("#undo");
  await expect.poll(async () => (await state(page)).group.s).toBe(1);
});

test("Erase removes blocks, and undo restores them", async () => {
  const before = await state(page), [x, y] = await personCentre(page, 3);
  await page.click("#tool [data-v=erase]");
  await page.locator("#brushSize").fill("4");
  await dragOn(page, [x - .05, y], [120, 0]);
  await expect.poll(async () => (await state(page)).filled).toBeLessThan(before.filled);
  expect((await state(page)).fixes).toBe(1);
  await page.click("#undo");
  await expect.poll(async () => (await state(page)).filled).toBe(before.filled);
  await page.click("#tool [data-v=move]");
});

test("An erase covers the same part of the person after Detail or Zoom changes, and Zoom keeps the edits", async () => {
  const busy = () => expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  // the share of the people's blocks that the stroke erased: compare with and without it (undo, then redo)
  const erased = async () => {
    const after = (await state(page)).filled;
    await page.click("#undo"); await expect.poll(async () => (await state(page)).fixes).toBe(0); await busy();
    const full = (await state(page)).filled;
    await page.click("#redo"); await expect.poll(async () => (await state(page)).fixes).toBe(1); await busy();
    expect((await state(page)).filled).toBe(after);
    return (full - after) / full;
  };
  const [x, y] = await personCentre(page, 3);
  await page.click("#tool [data-v=erase]");
  await page.locator("#brushSize").fill("4");
  await dragOn(page, [x - .05, y], [120, 0]);
  await expect.poll(async () => (await state(page)).fixes).toBe(1); await busy();
  const at64 = await erased();
  expect(at64).toBeGreaterThan(0.01);
  await openTab(page, "style");
  await page.locator("#width").fill("128"); await busy();
  const at128 = await erased();
  // before 1.13.3 the radius was in blocks, so at 128 the same stroke covered about a third as much
  expect(Math.abs(at128 / at64 - 1)).toBeLessThan(0.25);
  await page.locator("#p-style details.more summary").click();
  await page.locator("#zoom").uncheck(); await busy();
  expect((await state(page)).fixes).toBe(1); // Zoom used to clear every edit and the undo history
  await expect(page.locator("#undo")).toBeEnabled();
  const unzoomed = await erased();
  expect(Math.abs(unzoomed / at64 - 1)).toBeLessThan(0.35);
  await page.locator("#zoom").check(); await busy();
  await page.locator("#p-style details.more summary").click();
  await page.locator("#width").fill("64"); await busy();
  expect(Math.abs(await erased() / at64 - 1)).toBeLessThan(0.05);
  await page.click("#undo"); await expect.poll(async () => (await state(page)).fixes).toBe(0); await busy();
  await openTab(page, "edit"); await page.click("#tool [data-v=move]");
});

test("An adjusted box stays on the same part of the photo when Zoom is switched off and on", async () => {
  const busy = () => expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await page.click("#tool [data-v=move]");
  await page.click("#moveMode [data-v=boxes]");
  await expect.poll(async () => (await state(page)).boxRects).not.toBeNull();
  const [x0, y0, x1, y1] = (await state(page)).boxRects[0];
  await dragOn(page, [x1, (y0 + y1) / 2], [-25, 0]); // pull box 0's right edge in
  await expect.poll(async () => (await state(page)).adjusted[0]).toBe(true); await busy();
  const box = (await state(page)).boxesPhoto[0];
  await openTab(page, "style");
  await page.locator("#p-style details.more summary").click();
  for (const on of [false, true]) {
    await page.locator("#zoom").setChecked(on); await busy();
    const s = await state(page);
    expect(s.adjusted[0]).toBe(true);
    for (const k of ["x", "y", "w", "h"]) expect(s.boxesPhoto[0][k]).toBeCloseTo(box[k], 6);
  }
  await page.locator("#p-style details.more summary").click();
  await openTab(page, "edit");
  await page.click("#undo"); await expect.poll(async () => (await state(page)).adjusted[0] || false).toBe(false);
  await page.click("#moveMode [data-v=group]");
});

test("Save sticker downloads a 300 dpi PNG", async () => {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120_000 }), page.click("#saveSticker")]);
  const name = download.suggestedFilename(), inches = Number((name.match(/^posepop-[a-z]+-([\d.]+)in\.png$/) || [])[1]);
  expect(inches, name).toBeGreaterThan(0);
  const png = Buffer.concat(await (await download.createReadStream()).toArray());
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(Math.abs(png.readUInt32BE(16) - inches * 300)).toBeLessThanOrEqual(2); // width in pixels
  expect(png.subarray(37, 41).toString()).toBe("pHYs"); // print size: 300 dpi = 11811 pixels per metre
  expect([png.readUInt32BE(41), png.readUInt32BE(45), png[49]]).toEqual([11811, 11811, 1]);
  await expect(page.locator("#saveMsg")).toContainText("Saved " + name);
});
