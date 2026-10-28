// Keyboard editing on the preview and screen-reader announcements, on the group of seven.
import { test, expect, watch, openApp, loadPhoto, state, personCentre, openTab } from "./fixtures.mjs";

test.describe.configure({ mode: "serial" });
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

const announce = () => page.locator("#announce");

test("the preview is focusable, described, and says what it shows", async () => {
  const out = page.locator("#out");
  await expect(out).toHaveAttribute("tabindex", "0");
  await expect(out).toHaveAttribute("aria-describedby", "kbdHelp");
  await expect(out).toHaveAttribute("aria-label", /^7 people made of blocks, on /);
  await expect(page.locator("#srcNote")).toHaveAttribute("role", "status");
  await expect(page.locator("#saveMsg")).toHaveAttribute("role", "status");
  await out.focus();
  await expect(page.locator("#hover")).toHaveText(/^Keys: arrows move the group/);
});

test("on a fresh page, the first Tab offers a skip link straight to the picture", async ({ page }) => {
  await page.goto("?debug=1");
  await page.keyboard.press("Tab");
  const skip = page.locator("a.skip");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#out")).toBeFocused();
  await expect(page.locator("#hover")).toHaveText(/^Keys: arrows move the group/);
});

test("arrows move the group, and a burst of keys is one undo step", async () => {
  const out = page.locator("#out");
  await out.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Shift+ArrowUp");
  const s = await state(page);
  expect(s.group.dx).toBeLessThan(0);
  expect(s.group.dy).toBeLessThan(0);
  await expect(announce()).toHaveText("Group moved");
  await page.click("#undo");
  await expect.poll(async () => (await state(page)).group).toEqual({ dx: 0, dy: 0, s: 1 });
  await expect(announce()).toHaveText("Undone");
  expect((await state(page)).undo).toBe(false); // the whole burst was one step
});

test("+ and − resize, and the size is announced", async () => {
  await page.locator("#out").focus();
  await page.keyboard.press("+");
  await expect.poll(async () => (await state(page)).group.s).toBeCloseTo(1.05, 5);
  await expect(page.locator("#sizeRead")).toHaveText("105%");
  await expect(announce()).toHaveText("Size 105 percent");
  await page.keyboard.press("-");
  await expect.poll(async () => (await state(page)).group.s).toBeCloseTo(1, 5);
  await page.click("#undo");
});

test("in Move each, ] picks the next person and arrows move only that person", async () => {
  await page.click("#moveMode [data-v=each]");
  const out = page.locator("#out");
  await out.focus();
  await expect(page.locator("#hover")).toHaveText(/the selected person.*\[ and \] choose a person/);
  const a = await personCentre(page, 0), before = await personCentre(page, 1);
  await page.keyboard.press("]");
  await expect(announce()).toHaveText("Person 2 of 7 selected");
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(async () => (await personCentre(page, 1))[0]).toBeGreaterThan(before[0]);
  expect(await personCentre(page, 0)).toEqual(a);
  await expect(announce()).toHaveText("Person 2 moved");
  await page.keyboard.press("[");
  await expect(announce()).toHaveText("Person 1 of 7 selected");
  await page.click("#undo");
  await expect.poll(() => personCentre(page, 1)).toEqual(before);
  await page.click("#moveMode [data-v=group]");
});

test("keys do nothing with the Erase tool, and leave page shortcuts alone", async () => {
  await page.click("#tool [data-v=erase]");
  await page.locator("#out").focus();
  await page.keyboard.press("ArrowLeft");
  expect((await state(page)).group).toEqual({ dx: 0, dy: 0, s: 1 });
  expect((await state(page)).undo).toBe(false);
  await page.click("#tool [data-v=move]");
});
