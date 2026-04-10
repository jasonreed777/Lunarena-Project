import { expect, test, type BrowserContext, type Page } from "playwright/test";
import { createAccount, resetDB } from "./testUtils";

let userContext1: BrowserContext;
let userContext2: BrowserContext;
let page1: Page;
let page2: Page;

test.beforeEach(async ({ browser, request }) => {
  userContext1 = await browser.newContext();
  userContext2 = await browser.newContext();
  page1 = await userContext1.newPage();
  page2 = await userContext2.newPage();

  await resetDB(request);
});

test.afterEach(async () => {
  await userContext1.close();
  await userContext2.close();
});

/**
 * Testing clan functionality
 */
test.describe("Clan", () => {
  let username1: string = `test_user${Math.floor(Math.random() * 2_000_000)}`;
  const username2 = "test_user2";

  test.beforeEach(async () => {
    username1 = `test_user${Math.floor(Math.random() * 2_000_000)}`;

    await createAccount(page1, username1, "1234");
    await createAccount(page2, username2, "5678");
  });

  /**
   * This tests creating a clan with various attributes. Another will join the clan and
   * subsequently leave it.
   */
  test("create a clan and have a user join it and leave it", async () => {
    const clanName = `Clan Name ${Math.floor(Math.random() * 2_000_000)}`;

    await page1.goto("/clan");

    // Clans Page Loads
    await expect(page1.getByText("Pending Invites")).toHaveCount(2);
    await expect(page1.getByText("Public Clans")).toHaveCount(2);
    await expect(page1.getByText("Private Clans")).toHaveCount(2);

    await expect(page1.getByRole("button", { name: "Create New Clan" })).toBeVisible();

    // User 1 creates a new clan
    await page1.getByRole("button", { name: "Create New Clan" }).click();

    // Clan Creation Modal Loads
    await expect(page1.getByText("Create New Clan")).toHaveCount(2);
    await expect(page1.getByText("Clan Name")).toBeVisible();
    await expect(page1.getByText("Bio")).toBeVisible();
    await expect(page1.getByText("Color")).toBeVisible();
    await expect(page1.getByText("#24989e")).toBeVisible();

    // Add Attributes
    await page1.getByPlaceholder("Enter clan name (3-32 chars)").fill(clanName);
    await page1.getByPlaceholder("Describe your clan...").fill("Description goes here");
    await page1.locator('input[type="color"]').fill("#ab4acf");

    await page1.getByRole("button", { name: "Create Clan" }).click();
    await page1.goto("/clan");

    // Final Checks - Clan Page now is populated with new clan info
    await expect(page1.getByText(clanName)).toBeVisible();
    await expect(page1.getByText("Leaderboard")).toHaveCount(2);
    await expect(page1.getByText("Actions")).toBeVisible();
    await expect(page1.getByText("Recently Played")).toBeVisible();

    await expect(page1.locator(".friend-pill")).toHaveCount(1);

    await expect(page1.getByText("No active games")).toBeVisible();

    // User 2 joins a clan
    await page2.goto("/clan");
    await expect(page2.getByText(clanName)).toBeVisible();
    await expect(page2.getByRole("button", { name: "Join" })).toBeVisible();

    await page2.getByRole("button", { name: "Join" }).click();

    await page2.goto("/clan");

    // User 2 is now in the clan
    await expect(page2.getByText(clanName)).toBeVisible();
    await expect(page2.getByText("Leaderboard")).toHaveCount(2);
    await expect(page2.getByText("Actions")).toBeVisible();
    await expect(page2.getByText("Recently Played")).toBeVisible();

    await expect(page2.locator(".friend-pill")).toHaveCount(2);

    // User 2 Leaves the clan
    await expect(page2.getByRole("button", { name: "Leave Clan" })).toBeVisible();
    await page2.getByRole("button", { name: "Leave Clan" }).click();

    // Leave Clan Modal Appears
    await expect(page2.getByText("Are you sure you want to leave this clan?")).toBeVisible();
    await expect(page2.getByRole("button", { name: "Leave", exact: true })).toBeVisible();

    await page2.getByRole("button", { name: "Leave", exact: true }).click();

    // Final Checks - Initial Clan page renders
    await expect(page2.getByText("Pending Invites")).toHaveCount(2);
    await expect(page2.getByText("Public Clans")).toBeVisible();
    await expect(page2.getByText(clanName)).toBeVisible();
    await expect(page2.getByText("Private Clans")).toHaveCount(2);
  });
});
