import { test, expect, type Page } from "@playwright/test";
import { logInUser, resetDB } from "./testUtils.ts";

const THREAD_URL = "/forum/post/abadcafeabadcafeabadcafe";

let page1: Page;

test.beforeEach(async ({ browser, request }) => {
  await resetDB(request);
  const ctx = await browser.newContext();
  page1 = await ctx.newPage();
});

/** Add a comment to the current thread and wait for it to appear. */
async function addComment(page: Page, text: string) {
  await page.getByPlaceholder(/comment|thoughts/).fill(text);
  await page.getByRole("button", { name: "Add Comment" }).click();
  await expect(page.getByText(text)).toBeVisible();
}

test.describe("Forum Comment Voting", () => {
  test("should upvote a comment", async () => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto(THREAD_URL);

    await addComment(page1, "Test comment for voting");

    // Hover to reveal vote buttons, then click upvote
    const comment = page1
      .locator("[role='listitem']")
      .filter({ hasText: "Test comment for voting" });
    await comment.hover();
    await comment.getByRole("button", { name: "Upvote" }).click();

    await expect(comment.locator(".comment-score")).toHaveText("1");
    await expect(comment.locator(".upvote-btn.voted")).toBeVisible();
  });

  test("should downvote a comment", async () => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto(THREAD_URL);

    await addComment(page1, "Test comment for downvoting");

    const comment = page1
      .locator("[role='listitem']")
      .filter({ hasText: "Test comment for downvoting" });
    await comment.hover();
    await comment.getByRole("button", { name: "Downvote" }).click();

    await expect(comment.locator(".comment-score")).toHaveText("-1");
    await expect(comment.locator(".downvote-btn.voted")).toBeVisible();
  });

  test("should toggle off an upvote", async () => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto(THREAD_URL);

    await addComment(page1, "Test comment for toggle");

    const comment = page1
      .locator("[role='listitem']")
      .filter({ hasText: "Test comment for toggle" });
    await comment.hover();

    // Upvote
    await comment.getByRole("button", { name: "Upvote" }).click();
    await expect(comment.locator(".comment-score")).toHaveText("1");

    // Toggle off
    await comment.getByRole("button", { name: "Upvote" }).click();
    await expect(comment.locator(".comment-score")).toHaveText("0");
    await expect(comment.locator(".upvote-btn.voted")).not.toBeVisible();
  });

  test("should switch from upvote to downvote", async () => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto(THREAD_URL);

    await addComment(page1, "Test comment for switch");

    const comment = page1
      .locator("[role='listitem']")
      .filter({ hasText: "Test comment for switch" });
    await comment.hover();

    // Upvote first
    await comment.getByRole("button", { name: "Upvote" }).click();
    await expect(comment.locator(".comment-score")).toHaveText("1");

    // Switch to downvote
    await comment.getByRole("button", { name: "Downvote" }).click();
    await expect(comment.locator(".comment-score")).toHaveText("-1");
    await expect(comment.locator(".downvote-btn.voted")).toBeVisible();
    await expect(comment.locator(".upvote-btn.voted")).not.toBeVisible();
  });

  test("should persist votes after page reload", async () => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto(THREAD_URL);

    await addComment(page1, "Test comment for persistence");

    const comment = page1
      .locator("[role='listitem']")
      .filter({ hasText: "Test comment for persistence" });
    await comment.hover();
    await comment.getByRole("button", { name: "Upvote" }).click();
    await expect(comment.locator(".comment-score")).toHaveText("1");

    // Reload and verify
    await page1.goto(THREAD_URL);
    const reloadedComment = page1
      .locator("[role='listitem']")
      .filter({ hasText: "Test comment for persistence" });
    await expect(reloadedComment.locator(".comment-score")).toHaveText("1");
    await expect(reloadedComment.locator(".upvote-btn.voted")).toBeVisible();
  });
});
