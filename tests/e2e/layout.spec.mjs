// The studio layout: the picture stays in view while the settings scroll, on a phone and on a desktop,
// and the settings tabs follow the WAI-ARIA tabs pattern. Uses the built-in sample, so no detection is needed.
import { test, expect } from "./fixtures.mjs";

const ready = async page => {
  await page.goto("./");
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
};
// scroll to the end of the settings, then check the picture is still fully on screen
async function pictureStaysWhileScrolling(page) {
  await page.evaluate(() => scrollTo(0, document.querySelector(".rail").getBoundingClientRect().bottom + scrollY - innerHeight));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  const r = await page.locator("#out").boundingBox(), vh = page.viewportSize().height;
  expect(r.y).toBeGreaterThanOrEqual(0);
  expect(r.y + r.height).toBeLessThanOrEqual(vh);
  await expect(page.locator("#saveSticker")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), "no sideways scrolling").toBe(false);
}

for (const [name, viewport] of [["phone", { width: 400, height: 860 }], ["desktop", { width: 1280, height: 800 }]])
  test(`${name}: the picture and Save stay on screen at the end of the Print settings`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await ready(page);
    await page.click("#tab-print");
    await expect(page.locator("#p-print")).toBeVisible();
    await pictureStaysWhileScrolling(page);
    if (name === "phone") await expect(page.locator("#sheet")).toBeInViewport(); // the small sheet beside it
  });

test("one tab panel is open at a time, and arrows, Home and End move between tabs", async ({ page }) => {
  await ready(page);
  const tab = n => page.locator("#tab-" + n), panel = n => page.locator("#p-" + n);
  await expect(tab("style")).toHaveAttribute("aria-selected", "true");
  await expect(panel("style")).toBeVisible();
  for (const n of ["world", "edit", "print"]) await expect(panel(n)).toBeHidden();
  await tab("style").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab("world")).toBeFocused();
  await expect(tab("world")).toHaveAttribute("aria-selected", "true");
  await expect(panel("world")).toBeVisible();
  await expect(panel("style")).toBeHidden();
  await page.keyboard.press("End");
  await expect(tab("print")).toBeFocused();
  await page.keyboard.press("ArrowRight"); // wraps around
  await expect(tab("style")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(tab("print")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(tab("style")).toBeFocused();
  // only the selected tab is a Tab stop
  await expect(page.locator('[role=tab][tabindex="0"]')).toHaveCount(1);
});

test("kiosk guests see the styles and worlds without the tab row", async ({ page }) => {
  await page.goto("?kiosk=1");
  await page.click("#kGo");
  await page.click("#kBack");
  await expect(page.locator(".tablist")).toBeHidden();
  await expect(page.locator("#style")).toBeVisible();
  await expect(page.locator("#scenes")).toBeVisible();
  await expect(page.locator("#p-edit")).toBeHidden();
});
