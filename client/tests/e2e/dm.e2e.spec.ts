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

test.describe("Direct Messages", () => {
  test("should allow a user to navigate to the messages page", async () => {
    await logInUser(page1, "user0", "pwd0000");
    await page1.getByRole("link", { name: "Messages" }).click();
    await page1.waitForURL("/messages");
    await expect(page1.getByText("Direct Messages")).toBeVisible();
  });

  test("should allow starting a DM from a user profile", async () => {
    await logInUser(page1, "user1", "pwd1111");

    // Visit user2's profile and click the Message button
    await page1.goto("/profile/user2");
    await page1.getByRole("button", { name: "Message" }).click();

    // Should redirect to a specific chat
    await page1.waitForURL(/\/messages\/.+/);
    await expect(page1.getByPlaceholder("Send a message to Sénior Dos")).toBeVisible();
  });

  test("should send and receive messages in real time", async () => {
    // Log in both users
    await logInUser(page1, "user1", "pwd1111");
    await logInUser(page2, "user2", "pwd2222");

    // User1 creates the DM with user2
    await page1.goto("/profile/user2");
    await page1.getByRole("button", { name: "Message" }).click();
    await page1.waitForURL(/\/messages\/.+/);

    // Ensure user2 is on the messages page (socket connected, DM room joined)
    // before user1 sends — avoids a race where the dmChatJoin hasn't been
    // processed yet (App.tsx emits dmChatJoin right after socket.connect()).
    await page2.getByRole("link", { name: "Messages" }).click();
    await page2.waitForURL("/messages");
    await expect(page2.getByText("Direct Messages")).toBeVisible();
    // Open the chat with user1
    await page2.getByText("Yāo").click();
    await page2.waitForURL(/\/messages\/.+/);

    // Now user1 sends a message — user2's socket should be joined and listening
    await page1.getByPlaceholder("Send a message to Sénior Dos").fill("hello from user1");
    await page1.getByPlaceholder("Send a message to Sénior Dos").press("Enter");

    // Both sides should see the message
    await expect(page1.getByText("hello from user1")).toBeVisible();
    await expect(page2.getByText("hello from user1")).toBeVisible();

    // User2 sends a reply
    await page2.getByPlaceholder("Send a message to Yāo").fill("hello back from user2");
    await page2.getByPlaceholder("Send a message to Yāo").press("Enter");

    // Both users should see both messages
    await expect(page2.getByText("hello back from user2")).toBeVisible();
    await expect(page1.getByText("hello back from user2")).toBeVisible();
  });

  test("should persist messages after page reload", async () => {
    await logInUser(page1, "user1", "pwd1111");

    // Start a DM with user2 via their profile
    await page1.goto("/profile/user2");
    await page1.getByRole("button", { name: "Message" }).click();
    await page1.waitForURL(/\/messages\/.+/);

    // Send a message
    await page1.getByPlaceholder("Send a message to Sénior Dos").fill("persistent message");
    await page1.getByPlaceholder("Send a message to Sénior Dos").press("Enter");
    await expect(page1.getByText("persistent message")).toBeVisible();

    // Reload and verify the message is still there (fetched from DB)
    const chatUrl = page1.url();
    await page1.goto(chatUrl);
    await expect(page1.getByText("persistent message")).toBeVisible();
  });

  test("should show the chat list sorted by most recent message", async () => {
    await logInUser(page1, "user1", "pwd1111");

    // Start a DM with user3 via their profile
    await page1.goto("/profile/user3");
    await page1.getByRole("button", { name: "Message" }).click();
    await page1.waitForURL(/\/messages\/.+/);

    // Send a message to user3
    await page1.getByPlaceholder("Send a message to Frau Drei").fill("msg to user3");
    await page1.getByPlaceholder("Send a message to Frau Drei").press("Enter");
    await expect(page1.getByText("msg to user3")).toBeVisible();

    // Now start a DM with user2 via their profile
    await page1.goto("/profile/user2");
    await page1.getByRole("button", { name: "Message" }).click();
    await page1.waitForURL(/\/messages\/.+/);

    // Send a message to user2 (more recent)
    await page1.getByPlaceholder("Send a message to Sénior Dos").fill("msg to user2");
    await page1.getByPlaceholder("Send a message to Sénior Dos").press("Enter");
    await expect(page1.getByText("msg to user2")).toBeVisible();

    // Navigate to /messages to see the chat list
    await page1.getByRole("link", { name: "Messages" }).click();
    await page1.waitForURL("/messages");

    // The chat list is in .friend-list — user2 should appear before user3
    const chatItems = page1.locator(".friend-info");
    await expect(chatItems).toHaveCount(2);
    await expect(chatItems.nth(0)).toContainText("Sénior Dos");
    await expect(chatItems.nth(1)).toContainText("Frau Drei");
  });
});
