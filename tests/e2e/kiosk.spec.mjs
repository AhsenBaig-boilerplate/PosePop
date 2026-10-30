// Kiosk privacy: a guest who walks away without saving doesn't leave their photo for the next person. After IDLE_S
// with no tap or key (shortened here with ?debug=1&idle=20), the kiosk warns for the last 15 s and then goes back
// to the start screen with the built-in sample; any tap keeps the guest going.
import { test, expect, fixture } from "./fixtures.mjs";

test("an unsaved guest photo is cleared after the idle time, and a tap postpones it", async ({ page }) => {
  await page.goto("?kiosk=1&debug=1&idle=20");
  await page.click("#kGo");
  await page.click("#kBack"); // no camera in the test browser: go to the editing screen
  await expect(page.locator("#kStart")).toBeHidden();
  await page.locator("#pick").setInputFiles(fixture("single.jpg"));
  await expect(page.locator("#srcNote")).toContainText("single.jpg");
  const reset = page.locator("#kReset");
  await expect(reset).toBeHidden();
  // the warning comes in the last 15 s, and a tap takes it away and starts the wait again
  await expect(reset).toHaveText(/^Starting over for the next guest in \d+ s\. Tap anything to keep going\.$/, { timeout: 15_000 });
  await page.locator(".top").click({ position: { x: 5, y: 5 } });
  await expect(reset).toBeHidden();
  await page.waitForTimeout(3_000);
  await expect(page.locator("#kStart"), "the tap gave the guest more time").toBeHidden();
  // left alone, the kiosk goes back to the start screen and forgets the photo
  await expect(page.locator("#kStart")).toBeVisible({ timeout: 30_000 });
  await expect(reset).toBeHidden();
  await expect(page.locator("#srcNote")).toHaveText(/Showing the built-in sample/);
});

test("the start screen itself never resets, and operators with the settings shown aren't reset", async ({ page }) => {
  await page.goto("?kiosk=1&debug=1&idle=3");
  await expect(page.locator("#kStart")).toBeVisible();
  await page.waitForTimeout(5_000);
  await expect(page.locator("#kReset")).toBeHidden();
  // long-press the title to show the settings, as an operator does
  const h = page.locator("#kStart h1"), b = await h.boundingBox(); // the start screen's own title
  await page.mouse.move(b.x + 10, b.y + 10); await page.mouse.down(); await page.waitForTimeout(1_700); await page.mouse.up();
  await expect(page.locator("html")).toHaveClass(/unlocked/);
  await expect(page.locator("#kStart")).toBeHidden();
  await page.waitForTimeout(5_000);
  await expect(page.locator("html"), "still unlocked, nothing reset").toHaveClass(/unlocked/);
  await expect(page.locator("#kReset")).toBeHidden();
});
