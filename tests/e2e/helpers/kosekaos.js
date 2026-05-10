const { expect } = require("@playwright/test");

const SAVE_KEY = "kosekaos-save-v1";

async function openKosekaos(page, options = {}) {
  const { clearStorage = true, onboardingDone = true } = options;

  await page.addInitScript(
    ({ shouldClearStorage, shouldDisableOnboarding }) => {
      if (shouldClearStorage) {
        localStorage.clear();
      }
      if (shouldDisableOnboarding) {
        localStorage.setItem("kosekaos-onboarding-done", "1");
      }
    },
    {
      shouldClearStorage: clearStorage,
      shouldDisableOnboarding: onboardingDone
    }
  );

  await page.goto("/spill/kosekaos/");
  await waitForReady(page);
  await disableAnimations(page);
}

async function waitForReady(page) {
  await expect(page.getByTestId("start-btn")).toBeVisible();
  await page.waitForFunction(() => !!window.__kosekaosTestHooks);
  await expect(page.getByTestId("screen-start")).toHaveClass(/active/);
}

async function disableAnimations(page) {
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }"
  });
}

async function goToDecorScreen(page) {
  await page.getByTestId("start-btn").click();
  await expect(page.getByTestId("screen-avatar")).toHaveClass(/active/);

  await page.getByTestId("avatar-name-input").fill("QA Figur");
  await page.getByRole("button", { name: "Velg hus" }).click();
  await expect(page.getByTestId("screen-house")).toHaveClass(/active/);

  await page.getByTestId("goto-decor-btn").click();
  await expect(page.getByTestId("screen-decor")).toHaveClass(/active/);
}

async function placeItemInRoom(page, position = { x: 220, y: 220 }) {
  await page.getByTestId("room").click({ position });
}

async function readScore(page) {
  const text = await page.getByTestId("score-pill").innerText();
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

async function waitForAutosave(page) {
  await page.waitForFunction((key) => !!localStorage.getItem(key), SAVE_KEY);
}

async function readSavedState(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return { __parseError: true, raw };
    }
  }, SAVE_KEY);
}

module.exports = {
  SAVE_KEY,
  openKosekaos,
  waitForReady,
  goToDecorScreen,
  placeItemInRoom,
  readScore,
  waitForAutosave,
  readSavedState
};
