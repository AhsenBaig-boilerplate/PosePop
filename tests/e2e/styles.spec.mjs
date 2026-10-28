// Styles: every style draws without errors, and Fuse beads lists its beads and the pegboards they take.
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
