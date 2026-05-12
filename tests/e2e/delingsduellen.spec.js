const { test, expect } = require("@playwright/test");

test.describe("Delingsduellen E2E Smoke Tests", () => {
  test("loads game and renders start UI", async ({ page }) => {
    await page.goto("/laering/delingsduellen/");

    await expect(page.getByRole("img", { name: "Delingsduellen" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Start runde" })).toBeVisible();
    await expect(page.getByText("Poeng")).toBeVisible();
    // Check specific stat box for Niva
    await expect(page.locator(".stat-box", { hasText: "Niva" })).toBeVisible();
    // Check specific stat box for Streak
    await expect(page.locator(".stat-box", { hasText: "Streak" })).toBeVisible();
  });

  test("start round shows first question and timer", async ({ page }) => {
    await page.goto("/laering/delingsduellen/");

    const startBtn = page.getByRole("button", { name: "Start runde" });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Question should be visible (e.g. "12 / 3 = ?")
    const questionLabel = page.getByRole("heading").filter({ hasText: /\/.*=/ });
    await expect(questionLabel).toBeVisible();

    // Answer buttons should be present
    const answerButtons = page.getByRole("button", { name: /^\d+$/ });
    await expect(answerButtons).toHaveCount(4);

    // Status message should indicate game is running
    await expect(page.getByText(/Duellen er i gang/)).toBeVisible();
  });

  test("answering correctly increases score and streak", async ({ page }) => {
    await page.goto("/laering/delingsduellen/");

    // Start game
    await page.getByRole("button", { name: "Start runde" }).click();

    // Wait for question to load
    await page.waitForTimeout(100);

    // Get the question text (e.g. "12 / 3 = ?")
    const questionText = await page.getByRole("heading").filter({ hasText: /\/.*=/ }).textContent();
    const parts = questionText.match(/(\d+)\s*\/\s*(\d+)/);
    const dividend = parseInt(parts[1], 10);
    const divisor = parseInt(parts[2], 10);
    const correctAnswer = dividend / divisor;

    // Get initial score
    const scoreElement = page.getByText("Poeng").locator("..").getByRole("strong");
    const initialScore = parseInt(await scoreElement.textContent(), 10);

    // Find and click the correct answer
    const answerButtons = page.getByRole("button", { name: /^\d+$/ });
    const buttons = await answerButtons.all();
    let clicked = false;

    for (const button of buttons) {
      const text = await button.textContent();
      if (parseInt(text, 10) === correctAnswer) {
        await button.click();
        clicked = true;
        break;
      }
    }

    expect(clicked).toBeTruthy();

    // Wait for response
    await page.waitForTimeout(300);

    // Score should increase
    const newScore = parseInt(await scoreElement.textContent(), 10);
    expect(newScore).toBeGreaterThan(initialScore);

    // Streak should be > 0
    const streakElement = page.getByText("Streak").locator("..").getByRole("strong");
    const streak = parseInt(await streakElement.textContent(), 10);
    expect(streak).toBeGreaterThan(0);

    // Status should be positive (green)
    const statusLine = page.locator(".status-line");
    await expect(statusLine).toHaveClass(/good/);
  });

  test("answering incorrectly decreases score and resets streak", async ({ page }) => {
    await page.goto("/laering/delingsduellen/");

    // Start game
    await page.getByRole("button", { name: "Start runde" }).click();
    await page.waitForTimeout(100);

    // Get the question
    const questionText = await page.getByRole("heading").filter({ hasText: /\/.*=/ }).textContent();
    const parts = questionText.match(/(\d+)\s*\/\s*(\d+)/);
    const dividend = parseInt(parts[1], 10);
    const divisor = parseInt(parts[2], 10);
    const correctAnswer = dividend / divisor;

    const scoreElement = page.getByText("Poeng").locator("..").getByRole("strong");
    const initialScore = parseInt(await scoreElement.textContent(), 10);

    // Click the wrong answer (find one that's not correct)
    const answerButtons = page.getByRole("button", { name: /^\d+$/ });
    const buttons = await answerButtons.all();
    let clicked = false;

    for (const button of buttons) {
      const text = await button.textContent();
      if (parseInt(text, 10) !== correctAnswer) {
        await button.click();
        clicked = true;
        break;
      }
    }

    expect(clicked).toBeTruthy();
    await page.waitForTimeout(300);

    // Score should decrease or stay the same
    const newScore = parseInt(await scoreElement.textContent(), 10);
    expect(newScore).toBeLessThanOrEqual(initialScore);

    // Streak should be reset to 0
    const streakElement = page.getByText("Streak").locator("..").getByRole("strong");
    const streak = parseInt(await streakElement.textContent(), 10);
    expect(streak).toBe(0);

    // Status should show warning (yellow)
    const statusLine = page.locator(".status-line");
    await expect(statusLine).toHaveClass(/warn/);
  });

  test("game over overlay appears after too many falls", async ({ page }) => {
    await page.goto("/laering/delingsduellen/");

    // Start game
    await page.getByRole("button", { name: "Start runde" }).click();
    await page.waitForTimeout(100);

    // Force game over by simulating multiple falls
    // We'll answer incorrectly multiple times to trigger game over
    let fallCount = 0;
    const maxAttempts = 25; // Safety limit
    let attempts = 0;

    while (fallCount < 3 && attempts < maxAttempts) {
      attempts += 1;

      // Get current question
      const questionText = await page.getByRole("heading").filter({ hasText: /\/.*=/ }).textContent();

      if (!questionText || !questionText.includes("/")) {
        // Game might be over
        break;
      }

      const parts = questionText.match(/(\d+)\s*\/\s*(\d+)/);
      if (!parts) break;

      const dividend = parseInt(parts[1], 10);
      const divisor = parseInt(parts[2], 10);
      const correctAnswer = dividend / divisor;

      // Click wrong answer
      const answerButtons = page.getByRole("button", { name: /^\d+$/ });
      
      // Wait a bit for buttons to stabilize
      await page.waitForTimeout(100);
      
      const buttons = await answerButtons.all();

      if (buttons.length === 0) break;

      let clicked = false;
      for (const button of buttons) {
        const text = await button.textContent();
        if (parseInt(text, 10) !== correctAnswer) {
          try {
            await button.click({ timeout: 2000 });
            clicked = true;
            break;
          } catch {
            // Button might be disabled, try next one
            continue;
          }
        }
      }

      if (!clicked) break;

      await page.waitForTimeout(500); // Wait longer for feedback animation to complete

      // Wait for buttons to be enabled again
      try {
        await page.getByRole("button", { name: /^\d+$/ }).first().isEnabled({ timeout: 3000 });
      } catch {
        // If buttons don't become enabled, game might be over
      }

      // Check if game over overlay is visible
      const overlay = page.getByRole("dialog");
      if (await overlay.isVisible().catch(() => false)) {
        break;
      }

      // Count falls from the UI
      const fallsElement = page.getByText("Fall").locator("..").getByRole("strong");
      const fallsText = await fallsElement.textContent().catch(() => "0");
      fallCount = parseInt(fallsText, 10);
    }

    // Game over overlay should be visible
    const gameOverOverlay = page.getByRole("dialog");
    await expect(gameOverOverlay).toBeVisible();

    // Should have "Game over" title
    await expect(gameOverOverlay.getByRole("heading")).toContainText(/Game over|vant/i);

    // "Spill igjen" button should be visible
    await expect(gameOverOverlay.getByRole("button", { name: /Spill igjen/ })).toBeVisible();
  });

  test("restart button resets game state", async ({ page }) => {
    await page.goto("/laering/delingsduellen/");

    // Start a round
    await page.getByRole("button", { name: "Start runde" }).click();
    await page.waitForTimeout(100);

    // Answer a question to change score
    const questionText = await page.getByRole("heading").filter({ hasText: /\/.*=/ }).textContent();
    const parts = questionText.match(/(\d+)\s*\/\s*(\d+)/);
    const dividend = parseInt(parts[1], 10);
    const divisor = parseInt(parts[2], 10);
    const correctAnswer = dividend / divisor;

    const answerButtons = page.getByRole("button", { name: /^\d+$/ });
    const buttons = await answerButtons.all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (parseInt(text, 10) === correctAnswer) {
        await button.click();
        break;
      }
    }

    await page.waitForTimeout(300);

    // Click "Ny runde" (restart)
    const restartBtn = page.getByRole("button", { name: "Ny runde" });
    await restartBtn.click();
    await page.waitForTimeout(200);

    // Score should be reset to 0
    const scoreElement = page.getByText("Poeng").locator("..").getByRole("strong");
    const score = parseInt(await scoreElement.textContent(), 10);
    expect(score).toBe(0);

    // Start button should be visible again
    await expect(page.getByRole("button", { name: "Start runde" })).toBeVisible();

    // Game over overlay should be hidden or not exist
    const overlay = page.locator("#gameOverOverlay");
    const isHidden = await overlay.locator(":visible").count() === 0;
    expect(isHidden).toBeTruthy();
  });
});
