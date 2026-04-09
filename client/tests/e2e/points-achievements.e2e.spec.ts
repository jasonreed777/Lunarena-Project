import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createAndLoadGame } from "./testUtils.ts";

let userContext1: BrowserContext;
let userContext2: BrowserContext;
let page1: Page;
let page2: Page;

test.beforeEach(async ({ browser }) => {
  userContext1 = await browser.newContext();
  userContext2 = await browser.newContext();
  page1 = await userContext1.newPage();
  page2 = await userContext2.newPage();
});

test.afterEach(async () => {
  await userContext1.close();
  await userContext2.close();
});

// Gets points total from header text
async function getHeaderPoints(page: Page): Promise<number> {
  const text = await page
    .locator("#header")
    .getByText(/\d+ Point/)
    .first()
    .textContent();
  const match = text?.match(/\d+/);
  if (!match) {
    throw new Error(`Could not parse header points from text: ${text}`);
  }
  return Number(match[0]);
}

// Gets achievement count from header text
async function getHeaderAchievementCount(page: Page): Promise<number> {
  const headerText = await page.locator("#header").textContent();
  const match = headerText?.match(/(\d+) Achievement/);
  // If match fails, it means user has 0 achievements
  return match ? Number(match[1]) : 0;
}

// Get remaining objects from Nim
async function getRemainingObjects(page: Page): Promise<number> {
  const text = await page.getByText(/There are \d+ object/).textContent();
  const match = text?.match(/\d+/);
  if (!match) {
    throw new Error(`Could not parse remaining objects from text: ${text}`);
  }
  return Number(match[0]);
}

// Helper function to make a move in Nim by clicking the appropriate button
async function makeNimMove(page: Page, count: 1 | 2 | 3) {
  const labels = {
    1: "Take one",
    2: "Take two",
    3: "Take three",
  } as const;

  await page.getByRole("button", { name: labels[count] }).click();
}

// Helper function to determine the optimal move for page 1 to win at Nim, given the current remaining objects
function chooseWinningMoveForPage1(remaining: number): 1 | 2 | 3 {
  if (remaining === 1) {
    throw new Error("Page 1 cannot force a win from 1 remaining.");
  }
  if (remaining <= 4) {
    return (remaining - 1) as 1 | 2 | 3;
  }
  if (remaining % 4 === 1) {
    return 1;
  }
  return ((remaining - 1) % 4) as 1 | 2 | 3;
}

// Play through a game of nim with Page 1 winning
async function winNimGame(page1: Page, page2: Page): Promise<void> {
  while (!(await page1.getByText(/The game is over:/).isVisible())) {
    const page1Turn = await page1.getByRole("button", { name: "Take one" }).isEnabled();
    const currentPage = page1Turn ? page1 : page2;

    const beforeMoveRemaining = await getRemainingObjects(page1);
    const currentRemaining = await getRemainingObjects(currentPage);

    if (page1Turn) {
      const move = chooseWinningMoveForPage1(currentRemaining);
      await makeNimMove(page1, move);
    } else {
      await makeNimMove(page2, 1);
    }

    await expect.poll(async () => await getRemainingObjects(page1)).not.toBe(beforeMoveRemaining);
  }
  // Ensure page 1 is the winner
  await expect(page1.getByText(/you won by forcing/i)).toBeVisible();
}

test.describe("Points and achievements in the context of a Nim game", () => {
  test("awards points to the winner after a game ends", async () => {
    await createAndLoadGame(page1, page2, "nim", true, false);

    const initialPoints = await getHeaderPoints(page1);

    await winNimGame(page1, page2);
    // Awarded 7 points because: 1 point for login streak, 1 point for winning, 1 bonus point for winning first Nim game, and 5 points for first overall win.
    await expect
      .poll(async () => await getHeaderPoints(page1), { timeout: 10000 })
      .toBe(initialPoints + 7);
  });
});

test("shows unlocked achievements after a first win in nim", async () => {
  await createAndLoadGame(page1, page2, "nim", true, false);

  const initialAchievementsCount = await getHeaderAchievementCount(page1);

  await winNimGame(page1, page2);

  await expect
    .poll(async () => await getHeaderAchievementCount(page1), { timeout: 10000 })
    .toBe(initialAchievementsCount + 2);
});

test("loser does not gain points", async () => {
  await createAndLoadGame(page1, page2, "nim", true, false);
  // Get points for player 2
  const initialPoints = await getHeaderPoints(page2);
  // Player 1 wins game
  await winNimGame(page1, page2);
  // player 2 should have same points
  await expect.poll(async () => await getHeaderPoints(page2)).toBe(initialPoints);
});

test("loser does not gain achievements", async () => {
  await createAndLoadGame(page1, page2, "nim", true, false);
  // Get achievements count for player 2
  const initialAchievementsCount = await getHeaderAchievementCount(page2);
  // Player 1 wins game
  await winNimGame(page1, page2);
  // player 2 should have same achievements
  await expect
    .poll(async () => await getHeaderAchievementCount(page2))
    .toBe(initialAchievementsCount);
});
