// Styles: every style draws without errors, Fuse beads lists its beads and the pegboards they take, and Bricks its
// studs, the 1 × n bricks per color and the baseplates.
// Uses the built-in sample, so no detection is needed.
import { test, expect, closeDiag } from "./fixtures.mjs";

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
  for (const [style, units] of [["pixel", "pixels"], ["beads", "beads"], ["bricks", "bricks"], ["photo", null], ["emoji", "emoji"], ["blocks", "blocks"]]) {
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

test("Bricks: studs, a brick list per color that builds every stud, and baseplates", async ({ page }) => {
  await ready(page);
  await pick(page, "bricks");
  await expect(page.locator("#wRead")).toHaveText(/studs wide$/);
  await expect(page.locator("#setsLabel")).toHaveText("Brick colors");
  await expect(page.locator("#mSum")).toHaveText(/^\d+ colors · [\d,]+ studs · [\d,]+ bricks · \d+ baseplates? \(32 × 32\)$/);
  const sum = await page.locator("#mSum").textContent(), num = re => Number(sum.match(re)[1].replace(/,/g, ""));
  const studs = num(/([\d,]+) studs/), bricks = num(/([\d,]+) bricks/), plates = num(/(\d+) baseplates?/);
  expect(studs).toBe((await snap(page)).filled);
  expect(bricks, "bricks join studs in a row").toBeLessThan(studs);
  expect(plates).toBeGreaterThan(0);
  await page.click("#tab-print");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#saveCsv")]);
  expect(download.suggestedFilename()).toBe("posepop-bricks.csv");
  const rows = Buffer.concat(await (await download.createReadStream()).toArray()).toString().split("\n").map(r => r.split(","));
  const sizes = [8, 6, 4, 3, 2, 1];
  expect(rows[0]).toEqual(["Brick color", "Studs", "RGB", ...sizes.map(n => `1 × ${n}`)]);
  const colors = rows.slice(1).filter(r => r.length === 9);
  for (const r of colors) expect(r.slice(3).reduce((a, n, i) => a + Number(n) * sizes[i], 0), `${r[0]}: the bricks cover its studs`).toBe(Number(r[1]));
  expect(colors.reduce((a, r) => a + Number(r[1]), 0)).toBe(studs);
  expect(colors.reduce((a, r) => a + r.slice(3).reduce((x, n) => x + Number(n), 0), 0)).toBe(bricks);
  const plate = rows.find(r => r[0] === "Baseplates 32 × 32");
  expect(plate && Number(plate[1])).toBe(plates);
  expect(plate[2]).toMatch(/^\d+ across × \d+ down$/);
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
