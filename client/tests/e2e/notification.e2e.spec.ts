import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { logInUser, resetDB } from "./testUtils.ts";

let userContext1: BrowserContext;
let userContext2: BrowserContext;
let page1: Page;
let page2: Page;

test.beforeEach(async ({ browser, request }) => {
  await resetDB(request);
  userContext1 = await browser.newContext();
  userContext2 = await browser.newContext();
  page1 = await userContext1.newPage();
  page2 = await userContext2.newPage();
});

test.afterEach(async () => {
  await userContext1.close();
  await userContext2.close();
});

/** Helper: user1 sends a friend request to user0 via their profile page. */
async function sendFriendRequest(fromPage: Page, toUsername: string) {
  await fromPage.goto(`/profile/${toUsername}`);
  await fromPage.getByRole("button", { name: "Add Friend" }).click();
}

test.describe("Notifications", () => {
  test("should show a notification when a friend request is received", async () => {
    await logInUser(page1, "user0", "pwd0000");
    await logInUser(page2, "user1", "pwd1111");

    // user1 sends friend request to user0
    await sendFriendRequest(page2, "user0");

    // user0 should see the badge appear with count "1"
    await expect(page1.locator(".notification-badge")).toHaveText("1");

    // Open the notification menu
    await page1.locator(".notification-bell").click();

    // Should see the friend request notification
    await expect(page1.getByText("wants to be your friend")).toBeVisible();
  });

  test("should navigate to the sender's profile when clicking a friend request notification", async () => {
    await logInUser(page1, "user0", "pwd0000");
    await logInUser(page2, "user1", "pwd1111");

    await sendFriendRequest(page2, "user0");
    await expect(page1.locator(".notification-badge")).toHaveText("1");

    // Open notifications and click the notification item
    await page1.locator(".notification-bell").click();
    await page1.locator(".notification-item").click();

    // Should navigate to user1's profile
    await page1.waitForURL("/profile/user1");
  });

  test("should dismiss a single notification", async () => {
    await logInUser(page1, "user0", "pwd0000");
    await logInUser(page2, "user1", "pwd1111");

    await sendFriendRequest(page2, "user0");
    await expect(page1.locator(".notification-badge")).toHaveText("1");

    // Open notifications
    await page1.locator(".notification-bell").click();

    // Hover the notification to reveal the dismiss (X) button, then click it
    await page1.locator(".notification-item").hover();
    await page1.locator(".notification-dismiss").click();

    // Should show empty state and badge should disappear
    await expect(page1.getByText("No notifications")).toBeVisible();
    await expect(page1.locator(".notification-badge")).not.toBeVisible();
  });

  test("should clear all notifications", async () => {
    await logInUser(page1, "user0", "pwd0000");
    await logInUser(page2, "user1", "pwd1111");

    // Send two friend requests from different users
    await sendFriendRequest(page2, "user0");
    await expect(page1.locator(".notification-badge")).toHaveText("1");

    // Log in user2 on page2's context and send another request
    const page3 = await userContext2.newPage();
    await logInUser(page3, "user2", "pwd2222");
    await sendFriendRequest(page3, "user0");

    await expect(page1.locator(".notification-badge")).toHaveText("2");

    // Open notifications and clear all
    await page1.locator(".notification-bell").click();
    await page1.getByText("Clear all").click();

    // Should show empty state and badge should disappear
    await expect(page1.getByText("No notifications")).toBeVisible();
    await expect(page1.locator(".notification-badge")).not.toBeVisible();
  });

  test("should not receive notifications when disabled", async () => {
    await logInUser(page1, "user0", "pwd0000");
    await logInUser(page2, "user1", "pwd1111");

    // Disable notifications
    await page1.locator(".settings-icon").click();
    await page1.getByText("Notifications", { exact: true }).click();
    await expect(page1.locator(".notification-bell")).not.toBeVisible();

    // user1 sends a friend request while notifications are disabled
    await sendFriendRequest(page2, "user0");

    // Give time for a notification to arrive (it shouldn't)
    await page1.waitForTimeout(1000);
    await expect(page1.locator(".notification-bell")).not.toBeVisible();
    await expect(page1.locator(".notification-badge")).not.toBeVisible();
  });

  test("should receive notifications again after re-enabling", async () => {
    await logInUser(page1, "user0", "pwd0000");
    await logInUser(page2, "user1", "pwd1111");

    // Disable notifications
    await page1.locator(".settings-icon").click();
    await page1.getByText("Notifications", { exact: true }).click();
    await expect(page1.locator(".notification-bell")).not.toBeVisible();

    // Re-enable notifications — the settings menu may still be open from before
    const menu = page1.locator(".menu-container");
    if (!(await menu.isVisible())) {
      await page1.locator(".settings-icon").click();
    }
    await page1.getByText("Notifications", { exact: true }).click();
    await expect(page1.locator(".notification-bell")).toBeVisible();

    // Now send a friend request — notification should arrive
    await sendFriendRequest(page2, "user0");
    await expect(page1.locator(".notification-badge")).toHaveText("1");
  });
});
