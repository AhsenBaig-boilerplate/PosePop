// Shared test setup. Every test fails on a page error, a console error or a CSP violation.
// The CSP blocks string eval, so never use page.waitForFunction: poll from the test side with
// expect.poll or locator assertions. page.evaluate is fine (it runs over the DevTools protocol).
// The app's state is read through window.posepopState(), which exists only with ?debug=1.
import { test as base, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

export const fixture = name => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

// collects page errors, console errors and CSP violations on a page
export function watch(page) {
  const problems = [];
  page.on("pageerror", e => problems.push("page error: " + e.message));
  page.on("console", m => {
    if (m.type() === "error" || /Content Security Policy/i.test(m.text())) problems.push("console: " + m.text());
  });
  return problems;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = watch(page);
    await use(page);
    expect(problems, "page errors, console errors or CSP violations").toEqual([]);
  },
});
export { expect };

// the page is loaded (with the test snapshot) and person detection is ready
export async function openApp(page, path = "?debug=1") {
  await page.goto(path);
  await expect(page.locator("#segStatus")).toHaveAttribute("data-s", "ready", { timeout: 180_000 });
}

// with ?debug=1 the diagnostics panel floats over the top of the settings rail; collapse it before using the settings
export async function closeDiag(page) {
  const diag = page.locator("#diagToggle[aria-expanded=true]");
  if (await diag.count()) await diag.click();
}
export async function openTab(page, name) {
  await closeDiag(page);
  await page.click("#tab-" + name);
}

// choose a photo and wait until people are found and the blocks are placed
export async function loadPhoto(page, name) {
  await page.locator("#pick").setInputFiles(fixture(name));
  await expect(page.locator("#srcNote")).toContainText(name, { timeout: 30_000 });
  await expect(page.locator("#srcNote")).toHaveText(/found|cut-out by|uses color/, { timeout: 180_000 });
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  return state(page);
}

// the app's state: people found, blocks placed, each person's centre on the preview (fractions of the canvas),
// the group's move and size, and the undo and redo buttons
export const state = page => page.evaluate(() => ({
  ...window.posepopState(),
  undo: !document.getElementById("undo").disabled,
  redo: !document.getElementById("redo").disabled,
}));

// drag on the preview canvas, in steps so pointermove fires, from a point given as fractions of its size
export async function dragOn(page, [fx, fy], [dx, dy]) {
  const out = page.locator("#out");
  await out.scrollIntoViewIfNeeded();
  const r = await out.boundingBox(), x = r.x + r.width * fx, y = r.y + r.height * fy;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + dx * i / 10, y + dy * i / 10);
  await page.mouse.up();
}

export const personCentre = async (page, k = 0) => (await state(page)).people[k];
