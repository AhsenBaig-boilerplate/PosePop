// Person detection on the committed NASA photos (tests/fixtures/README.md), plus the backdrop key.
import { test, expect, openApp, loadPhoto, state } from "./fixtures.mjs";

for (const [file, people] of [["single.jpg", 1], ["seated.jpg", 1], ["group7.jpg", 7]]) {
  test(`finds ${people} ${people === 1 ? "person" : "people"} in ${file}`, async ({ page }) => {
    await openApp(page);
    const s = await loadPhoto(page, file);
    await expect(page.locator("#srcNote")).toContainText(`${people} ${people === 1 ? "person" : "people"} found`);
    expect(s.boxes).toBe(people);
    expect(s.filled).toBeGreaterThan(200); // a real cut-out, not an empty sheet
  });
}

test("detection runs in the worker and reports it", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#diag")).toBeVisible();
  await expect(page.locator("#diagList")).toContainText(/ready after/);
  await expect(page.locator("#diagList")).toContainText(/Web Worker \(page stays responsive\)/);
});

test("green screen key removes the backdrop and can be switched off", async ({ page }) => {
  await openApp(page);
  const before = await loadPhoto(page, "greenscreen.jpg");
  await page.locator("#keyOn").check();
  await expect(page.locator("#keyNote")).toContainText(/Screen colour found .*% of the photo removed/);
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  expect((await state(page)).keyed).toBe(true);
  await page.locator("#keyOn").uncheck();
  await expect(page.locator("#keyGroup")).toBeHidden();
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  const after = await state(page);
  expect(after.keyed).toBe(false);
  expect(after.filled).toBe(before.filled); // back to the detector's cut-out
});
