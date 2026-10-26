// The update flow (a newer build in version.json), the version picker and release notes, and offline use.
import { test, expect, fixture } from "./fixtures.mjs";
import { readFileSync } from "node:fs";

const served = JSON.parse(readFileSync(new URL("../../dist/version.json", import.meta.url), "utf8"));
const NEWER = "0000000-ffffffffffff";
const newerBuild = route => route.fulfill({ json: { ...served, build: NEWER } });

test.describe("updates and versions", () => {
  // the service worker would answer these fetches itself, out of reach of page.route
  test.use({ serviceWorkers: "block" });

  test("footer says up to date when version.json matches", async ({ page }) => {
    await page.goto("");
    await expect(page.locator("#version")).toContainText(`PosePop ${served.version} · built`);
    await expect(page.locator("#version")).toContainText("up to date", { timeout: 20_000 });
    await expect(page.locator("#version")).toHaveAttribute("title", "Build " + served.build);
    expect(await page.evaluate(() => typeof window.posepopState)).toBe("undefined"); // the test snapshot needs ?debug=1
  });

  test("a newer build moves straight to it when nothing would be lost, once", async ({ page }) => {
    await page.route("**/version.json?*", newerBuild);
    await page.goto("");
    await page.waitForURL(u => u.searchParams.get("v") === NEWER, { timeout: 20_000 });
    // this server still has the old build, so the new page offers the update instead of reloading again
    await expect(page.locator("#version")).toContainText("update ready: version 0000000", { timeout: 20_000 });
    await expect(page.locator("#update")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("v")).toBe(NEWER);
  });

  test("mid-edit, a newer build waits for the update button", async ({ page }) => {
    await page.goto("");
    await expect(page.locator("#version")).toContainText("up to date", { timeout: 20_000 });
    await page.locator("#pick").setInputFiles(fixture("single.jpg")); // user work starts here
    await page.route("**/version.json?*", newerBuild);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); // the guest comes back to the tab
    await expect(page.locator("#update")).toBeVisible({ timeout: 20_000 });
    expect(new URL(page.url()).searchParams.get("v")).toBeNull(); // no reload under the user's feet
    await Promise.all([page.waitForURL(u => u.searchParams.get("v") === NEWER), page.click("#updateBtn")]);
  });

  test("version picker lists releases, keeps page options, and shows notes as text", async ({ page }) => {
    // a build of main between releases is labelled "1.5.2+abc1234" and gets its own Latest entry in the notes
    const base = served.version.split("+")[0], between = served.version !== base;
    await page.route("**/releases.json", route => route.fulfill({ json: {
      latest: { version: served.version, build: served.build, headline: "Now", notes: ["**Now:** current notes."] },
      releases: [
        { version: base, date: "26 October 2026", path: `v/${base}/`, headline: "Now", notes: ["**Now:** current notes."] },
        { version: "1.0.0", date: "24 October 2026", path: "v/1.0.0/", headline: "First",
          notes: ["**First:** uses `code` and <img src=x id=injected> stays text."] },
      ] } }));
    await page.goto("?debug=1");
    await expect(page.locator("#vpick")).toBeVisible();
    await expect(page.locator("#versionPick option")).toHaveText([`Latest (${served.version}) — Now`, `${base} · 26 October 2026 — Now`, "1.0.0 · 24 October 2026 — First"]);
    await page.click("#notesBtn");
    await expect(page.locator("#notes h4.cur")).toHaveText(between ? `Latest (${served.version}) (this version)` : `${base} · 26 October 2026 (this version)`);
    await expect(page.locator("#notes li strong").last()).toHaveText("First:");
    await expect(page.locator("#notes li code")).toHaveText("code");
    await expect(page.locator("#notes")).toContainText("<img src=x id=injected> stays text.");
    await expect(page.locator("#injected")).toHaveCount(0);
    await page.route("**/v/1.0.0/**", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>1.0.0</title>" }));
    const [req] = await Promise.all([page.waitForRequest("**/v/1.0.0/**"), page.selectOption("#versionPick", { label: "1.0.0 · 24 October 2026 — First" })]);
    expect(new URL(req.url()).pathname + new URL(req.url()).search).toBe("/v/1.0.0/?debug=1");
  });
});

test("works offline after the first visit, detection included", async ({ page, context }) => {
  await page.goto("");
  await expect(page.locator("#version")).toContainText("works offline", { timeout: 180_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#version")).toContainText("offline");
  await expect(page.locator("#segStatus")).toHaveAttribute("data-s", "ready", { timeout: 180_000 });
  await expect(page.locator("#version")).toContainText("works offline");
});
