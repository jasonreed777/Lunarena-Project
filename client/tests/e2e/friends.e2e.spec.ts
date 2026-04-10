import { expect, test, type BrowserContext, type Page } from "playwright/test";
import { createAccount } from "./testUtils";

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

/**
 * This tests adding a friend and accepting or rejecting the friend request.
 */
test.describe("Add a friend", () => {
  let username1: string = `test_user${Math.floor(Math.random() * 2_000_000)}`;
  let username2: string = `test_user${Math.floor(Math.random() * 2_000_000)}`;

  test.beforeEach(async () => {
    username1 = `test_user${Math.floor(Math.random() * 2_000_000)}`;
    username2 = `test_user${Math.floor(Math.random() * 2_000_000)}`;

    await createAccount(page1, username1, "1234");
    await createAccount(page2, username2, "5678");
  });

  /**
   * Two players: P1 and P2, are involved. P1 sends a friend request to P2, who accepts it.
   */
  test("add a friend and accept a friend request", async () => {
    await page1.goto("/friends");
    await page2.goto("/friends");

    // Friends Page Loads for both users
    await expect(page1.getByPlaceholder("Search users by name or username...")).toBeVisible();
    await expect(page1.getByText("No friends yet")).toBeVisible();
    await expect(page1.getByText("No sent requests")).toBeVisible();
    await expect(page1.getByText("No pending requests")).toBeVisible();
    await expect(page1.getByText(username2)).not.toBeVisible();
    await expect(page1.getByRole("button", { name: "Add Friend" })).not.toBeVisible();

    await expect(page2.getByPlaceholder("Search users by name or username...")).toBeVisible();
    await expect(page2.getByText("No friends yet")).toBeVisible();
    await expect(page2.getByText("No sent requests")).toBeVisible();
    await expect(page2.getByText("No pending requests")).toBeVisible();
    await expect(page2.getByText(`@${username1}`)).not.toBeVisible();
    await expect(page2.getByRole("button", { name: "Accept" })).not.toBeVisible();
    await expect(page2.getByRole("button", { name: "Reject" })).not.toBeVisible();

    // P1: Search for P2
    await page1.getByPlaceholder("Search users by name or username...").fill(username2);
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
    await expect(page1.getByRole("button", { name: "Add Friend" })).toBeVisible();

    // P1: Add P2 as Friend
    await page1.getByRole("button", { name: "Add Friend" }).click();
    await expect(page1.getByRole("button", { name: "Pending" })).toHaveCount(2);

    await page2.goto("/friends");

    // P2: Friend Request appears
    await expect(page2.getByText(`@${username1}`)).toBeVisible();
    await expect(page2.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(page2.getByRole("button", { name: "Reject" })).toBeVisible();

    // P2: Accept P1's friend request
    await page2.getByRole("button", { name: "Accept" }).click();

    await page1.goto("/friends");

    // Final Checks - P1 and P2 are now friends
    const page1Locator = page1.locator("#friends-list");
    const page2Locator = page2.locator("#friends-list");

    await expect(page1.getByRole("button", { name: "Message" })).toBeVisible();
    await expect(page1.getByRole("button", { name: "Remove Friend" })).toBeVisible();
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
    await expect(page1Locator).toHaveCount(1);

    await expect(page2.getByRole("button", { name: "Message" })).toBeVisible();
    await expect(page2.getByRole("button", { name: "Remove Friend" })).toBeVisible();
    await expect(page2.getByText(`@${username1}`)).toBeVisible();
    await expect(page2Locator).toHaveCount(1);
  });

  /**
   * Two players: P1 & P2, are involved. P1 sends a friend request to P2, who rejects it.
   */
  test("add a friend and reject a friend request", async () => {
    await page1.goto("/friends");
    await page2.goto("/friends");

    // Friends Page Loads for both users
    await expect(page1.getByPlaceholder("Search users by name or username...")).toBeVisible();
    await expect(page1.getByText("No friends yet")).toBeVisible();
    await expect(page1.getByText("No sent requests")).toBeVisible();
    await expect(page1.getByText("No pending requests")).toBeVisible();
    await expect(page1.getByText(username2)).not.toBeVisible();
    await expect(page1.getByRole("button", { name: "Add Friend" })).not.toBeVisible();

    await expect(page2.getByPlaceholder("Search users by name or username...")).toBeVisible();
    await expect(page2.getByText("No friends yet")).toBeVisible();
    await expect(page2.getByText("No sent requests")).toBeVisible();
    await expect(page2.getByText("No pending requests")).toBeVisible();
    await expect(page2.getByText(`@${username1}`)).not.toBeVisible();
    await expect(page2.getByRole("button", { name: "Accept" })).not.toBeVisible();
    await expect(page2.getByRole("button", { name: "Reject" })).not.toBeVisible();

    // P1: Search for P2
    await page1.getByPlaceholder("Search users by name or username...").fill(username2);
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
    await expect(page1.getByRole("button", { name: "Add Friend" })).toBeVisible();

    // P1: Add P2 as Friend
    await page1.getByRole("button", { name: "Add Friend" }).click();
    await expect(page1.getByRole("button", { name: "Pending" })).toHaveCount(2);

    await page2.goto("/friends");

    // P2: Friend Request appears
    await expect(page2.getByText(`@${username1}`)).toBeVisible();
    await expect(page2.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(page2.getByRole("button", { name: "Reject" })).toBeVisible();

    // P2: Reject P1's friend request
    await page2.getByRole("button", { name: "Reject" }).click();

    await page1.goto("/friends");
    await page2.goto("/friends");

    // Final Checks
    await expect(page1.getByText(`@${username2}`)).not.toBeVisible();
    await expect(page2.getByText(`@${username1}`)).not.toBeVisible();
  });
});

/**
 * This tests removing a friend.
 */
test.describe("Remove a friend", () => {
  const username1: string = "test_user1";
  const username2: string = "test_user2";

  test.beforeEach(async () => {
    await createAccount(page1, username1, "1234");
    await createAccount(page2, username2, "5678");
  });

  /**
   * Two players: P1 & P2, are involved. P1 sends a friend request to P2, who accepts it.
   */
  test("add a friend and accept a friend request", async () => {
    await page1.goto("/friends");
    await page2.goto("/friends");

    // Friends Page Loads for both users
    await expect(page1.getByPlaceholder("Search users by name or username...")).toBeVisible();
    await expect(page1.getByText("No friends yet")).toBeVisible();
    await expect(page1.getByText("No sent requests")).toBeVisible();
    await expect(page1.getByText("No pending requests")).toBeVisible();
    await expect(page1.getByText(username2)).not.toBeVisible();
    await expect(page1.getByRole("button", { name: "Add Friend" })).not.toBeVisible();

    await expect(page2.getByPlaceholder("Search users by name or username...")).toBeVisible();
    await expect(page2.getByText("No friends yet")).toBeVisible();
    await expect(page2.getByText("No sent requests")).toBeVisible();
    await expect(page2.getByText("No pending requests")).toBeVisible();
    await expect(page2.getByText(`@${username1}`)).not.toBeVisible();
    await expect(page2.getByRole("button", { name: "Accept" })).not.toBeVisible();
    await expect(page2.getByRole("button", { name: "Reject" })).not.toBeVisible();

    // P1: Search for P2
    await page1.getByPlaceholder("Search users by name or username...").fill(username2);
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
    await expect(page1.getByRole("button", { name: "Add Friend" })).toBeVisible();

    // P1: Add P2 as Friend
    await page1.getByRole("button", { name: "Add Friend" }).click();
    await expect(page1.getByRole("button", { name: "Pending" })).toHaveCount(2);

    await page2.goto("/friends");

    // P2: Friend Request appears
    await expect(page2.getByText(`@${username1}`)).toBeVisible();
    await expect(page2.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(page2.getByRole("button", { name: "Reject" })).toBeVisible();

    // P2: Accept P1's friend request
    await page2.getByRole("button", { name: "Accept" }).click();

    await page1.goto("/friends");

    // P1 and P2 are now friends
    const page1Locator = page1.locator("#friends-list");
    const page2Locator = page2.locator("#friends-list");

    await expect(page1.getByRole("button", { name: "Message" })).toBeVisible();
    await expect(page1.getByRole("button", { name: "Remove Friend" })).toBeVisible();
    await expect(page1.getByText(`@${username2}`)).toBeVisible();
    await expect(page1Locator).toHaveCount(1);

    await expect(page2.getByRole("button", { name: "Message" })).toBeVisible();
    await expect(page2.getByRole("button", { name: "Remove Friend" })).toBeVisible();
    await expect(page2.getByText(`@${username1}`)).toBeVisible();
    await expect(page2Locator).toHaveCount(1);

    // P1: Remove P2 as Friend
    await page1.getByRole("button", { name: "Remove Friend" }).click();
    page1.on("dialog", (dialog) => dialog.accept());

    await page1.goto("/friends");
    await page2.goto("/friends");

    // Final Checks - P1 and P2 are no longer friends
    await expect(page1.getByText(`@${username2}`)).not.toBeVisible();
    await expect(page2.getByText(`@${username1}`)).not.toBeVisible();
  });
});
