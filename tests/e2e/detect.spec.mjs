// Person detection on the committed NASA photos (tests/fixtures/README.md), plus the backdrop key.
import { test, expect, openApp, loadPhoto, state, closeDiag } from "./fixtures.mjs";

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
  // the cut-out gate runs on WebGL; without it (as in CI) it is off, and says why
  await expect(page.locator('#diagList h4:text-is("Detection") + dl dt:text-is("body gate") + dd')).toHaveText(/^on$|^off \(no WebGL/);
  await expect(page.locator('#diagList h4:text-is("Errors") + dl dt:text-is("body model")')).toHaveCount(0);
});

test("the body gate trims what Selfie wrongly keeps (the car seat in seated.jpg)", async ({ page }) => {
  test.setTimeout(480_000);
  await openApp(page, "?debug=1&gate=0");
  await expect(page.locator('#diagList h4:text-is("Detection") + dl dt:text-is("body gate") + dd')).toHaveText("off (turned off)");
  const plain = await loadPhoto(page, "seated.jpg");
  await openApp(page, "?debug=1&gate=1");
  await expect(page.locator('#diagList h4:text-is("Detection") + dl dt:text-is("body gate") + dd')).toHaveText(/^on/);
  const gated = await loadPhoto(page, "seated.jpg");
  expect(gated.boxes).toBe(1);
  console.log("seated.jpg cells: plain", plain.filled, "gated", gated.filled);
  expect(gated.filled, "fewer cells: the seat and smudges are gone").toBeLessThan(plain.filled * .95);
  expect(gated.filled, "but the person is still there").toBeGreaterThan(plain.filled * .6);
});

test("green screen key removes the backdrop and can be switched off", async ({ page }) => {
  await openApp(page);
  const before = await loadPhoto(page, "greenscreen.jpg");
  await closeDiag(page);
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
