// The Erase and Restore brush ring: it follows the mouse over the picture at the size a stroke covers, shows which tool
// is on, and steps aside for the other tools. Uses the built-in sample, so no detection is needed.
import { test, expect, closeDiag } from "./fixtures.mjs";

const ring = page => page.evaluate(() => { const e = document.getElementById("brush"), r = e.getBoundingClientRect();
  return { hidden: e.hidden, keep: e.classList.contains("keep"), w: r.width, cx: r.x + r.width / 2, cy: r.y + r.height / 2,
    cursor: getComputedStyle(document.getElementById("out")).cursor }; });

test("the brush ring shows where Erase and Restore paint, at the brush's size", async ({ page }) => {
  await page.goto("?debug=1");
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await closeDiag(page);
  await page.click("#tab-edit");
  const r = await page.locator("#out").boundingBox(), X = r.x + r.width * .35, Y = r.y + r.height * .7;
  const cell = await page.evaluate(() => { const g = window.posepopState().grid, c = document.getElementById("out"); return g.cell * c.getBoundingClientRect().width / c.width; });
  const hover = async () => { await page.mouse.move(X, Y); await page.mouse.move(X + 1, Y); };

  await page.click("#tool [data-v=erase]"); await hover();
  let b = await ring(page);
  expect(b.hidden).toBe(false);
  expect(b.keep).toBe(false);
  expect(b.cursor, "the ring replaces the crosshair").toBe("none");
  expect(Math.abs(b.cx - (X + 1))).toBeLessThan(1.5);
  expect(Math.abs(b.cy - Y)).toBeLessThan(1.5);
  expect(b.w / cell, "brush 2 covers a stroke radius of 1.5 cells").toBeCloseTo(3, 1);

  await page.locator("#brushSize").fill("6"); // the slider shows the new size in the middle of the picture
  b = await ring(page);
  expect(b.hidden).toBe(false);
  expect(b.w / cell).toBeCloseTo(9, 1);
  expect(Math.abs(b.cx - (r.x + r.width / 2))).toBeLessThan(1.5);
  await expect.poll(async () => (await ring(page)).hidden).toBe(true);

  await page.click("#tool [data-v=keep]"); await hover();
  b = await ring(page);
  expect(b.hidden).toBe(false);
  expect(b.keep, "Restore has its own look").toBe(true);

  await page.mouse.move(r.x - 20, r.y - 20);
  expect((await ring(page)).hidden, "leaving the picture hides it").toBe(true);
  for (const tool of ["area", "move"]) {
    await page.click(`#tool [data-v=${tool}]`); await hover();
    expect((await ring(page)).hidden, `no ring with ${tool}`).toBe(true);
  }
});
