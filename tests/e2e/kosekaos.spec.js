const { test, expect } = require("@playwright/test");
const {
  SAVE_KEY,
  openKosekaos,
  goToDecorScreen,
  placeItemInRoom,
  readScore,
  waitForAutosave,
  readSavedState
} = require("./helpers/kosekaos");

test.describe("Kosekaos E2E", () => {
  test("loads game entry and renders root UI", async ({ page }) => {
    await openKosekaos(page);

    await expect(page.getByRole("heading", { name: "Kosekaos" })).toBeVisible();
    await expect(page.getByTestId("start-btn")).toBeVisible();
    await expect(page.getByTestId("score-pill")).toContainText("Poeng:");
  });

  test("start new game by keyboard and progress to decor with score change", async ({ page }) => {
    await openKosekaos(page);

    await page.getByTestId("start-btn").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("screen-avatar")).toHaveClass(/active/);

    await page.getByTestId("avatar-name-input").focus();
    await page.keyboard.type("TastaturTest");

    const gotoHouse = page.getByRole("button", { name: "Velg hus" });
    await gotoHouse.focus();
    await page.keyboard.press("Enter");

    const gotoDecor = page.getByTestId("goto-decor-btn");
    await gotoDecor.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("screen-decor")).toHaveClass(/active/);

    const before = await readScore(page);
    await placeItemInRoom(page);
    const after = await readScore(page);

    expect(after).toBeGreaterThan(before);
    await expect(page.locator("#room .placed")).toHaveCount(1);
  });

  test("touch/mobile placement works and does not trigger unintended scroll", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Touch emulation project is Chromium based");

    await openKosekaos(page);
    await goToDecorScreen(page);

    await page.getByTestId("room").scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await placeItemInRoom(page, { x: 160, y: 210 });

    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(4);
    await expect(page.locator("#room .placed")).toHaveCount(1);
  });

  test("restart resets gameplay state and score", async ({ page }) => {
    await openKosekaos(page);
    await goToDecorScreen(page);

    await placeItemInRoom(page);
    await expect(page.locator("#room .placed")).toHaveCount(1);

    await page.getByTestId("finish-btn").click({ force: true });
    await expect(page.getByTestId("screen-summary")).toHaveClass(/active/);

    await page.getByTestId("restart-btn").click();
    await expect(page.getByTestId("screen-start")).toHaveClass(/active/);
    await expect(page.getByTestId("score-pill")).toContainText("Poeng: 0");
  });

  test("save state in localStorage and continue restores progress", async ({ page }) => {
    await openKosekaos(page);
    await goToDecorScreen(page);

    await placeItemInRoom(page);
    await expect(page.locator("#room .placed")).toHaveCount(1);
    await waitForAutosave(page);

    const firstSaved = await readSavedState(page);
    expect(firstSaved).toBeTruthy();
    expect(firstSaved.state.score).toBeGreaterThan(0);
    expect(typeof firstSaved.state.score).toBe("number");

    await placeItemInRoom(page, { x: 280, y: 240 });
    await waitForAutosave(page);

    const secondSaved = await readSavedState(page);
    expect(secondSaved.state.score).toBeGreaterThanOrEqual(firstSaved.state.score);

    const restoredPage = await page.context().newPage();
    await restoredPage.goto("/spill/kosekaos/");
    await expect(restoredPage.getByTestId("continue-btn")).toBeVisible();
    await restoredPage.getByTestId("continue-btn").click();
    await restoredPage.waitForFunction(() => {
      if (!window.__kosekaosTestHooks) return false;
      return window.__kosekaosTestHooks.getState().score > 0;
    });
    await expect(restoredPage.getByTestId("score-pill")).toContainText(String(secondSaved.state.score));
  });

  test("corrupt localStorage is handled without crash", async ({ page }) => {
    await page.addInitScript((saveKey) => {
      localStorage.setItem(saveKey, "{bad-json");
      localStorage.setItem("kosekaos-onboarding-done", "1");
    }, SAVE_KEY);

    await page.goto("/spill/kosekaos/");
    await expect(page.getByTestId("start-btn")).toBeVisible();

    const hooksReady = await page.evaluate(() => !!window.__kosekaosTestHooks);
    expect(hooksReady).toBeTruthy();
  });

  test("focus/blur roundtrip does not create score jump", async ({ page }) => {
    await openKosekaos(page);
    await goToDecorScreen(page);

    const before = await readScore(page);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("blur"));
      window.dispatchEvent(new Event("focus"));
    });
    const after = await readScore(page);

    expect(after).toBe(before);
  });

  test("resizing during session keeps room interactive", async ({ page }) => {
    await openKosekaos(page);
    await goToDecorScreen(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await placeItemInRoom(page, { x: 280, y: 220 });

    await page.setViewportSize({ width: 900, height: 640 });
    await placeItemInRoom(page, { x: 180, y: 200 });

    await expect(page.locator("#room .placed")).toHaveCount(2);
  });

  test("a11y sanity: key controls are reachable and labelled", async ({ page }) => {
    await openKosekaos(page);

    await expect(page.getByRole("button", { name: "Start spillet" })).toBeVisible();
    await expect(page.getByTestId("score-pill")).toHaveAttribute("aria-live", "polite");

    await page.getByTestId("start-btn").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("screen-avatar")).toHaveClass(/active/);
    await expect(page.getByTestId("avatar-name-input")).toBeVisible();
  });
});
