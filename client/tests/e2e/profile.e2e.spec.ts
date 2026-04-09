import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { logInUser, resetDB } from "./testUtils.ts";

let page1: Page;

test.beforeEach(async ({ browser, request }) => {
  await resetDB(request);
  const ctx = await browser.newContext();
  page1 = await ctx.newPage();
});

test.describe("Profile Customization", () => {
  test("should allow updating the display name", async () => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto("/profile/user1");
    await page1.waitForLoadState("networkidle");

    // Clear and set a new display name
    const displayInput = page1.locator("input.widefill").first();
    await displayInput.clear();
    await displayInput.fill("NewDisplay");

    // Submit — display name change triggers logout
    await page1.getByRole("button", { name: "Submit" }).click();
    await page1.waitForURL("/login");

    // Log back in and verify the new display name persisted
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto("/profile/user1");
    const updatedInput = page1.locator("input.widefill").first();
    await expect(updatedInput).toHaveValue("NewDisplay");
  });

  test("should allow setting a bio", async ({ browser }) => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto("/profile/user1");
    await page1.waitForLoadState("networkidle");

    // Fill in the bio
    await page1.getByPlaceholder("Tell people a bit about yourself!").fill("Hello, I am user1!");
    await page1.getByRole("button", { name: "Submit" }).click();

    // Bio-only change keeps user logged in, shows success
    await expect(page1.getByText("Profile updated successfully")).toBeVisible();

    // Verify from another user's perspective
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await logInUser(page2, "user2", "pwd2222");
    await page2.goto("/profile/user1");
    await page2.waitForLoadState("networkidle");
    await expect(page2.getByText("Hello, I am user1!")).toBeVisible();
    await ctx2.close();
  });

  test("should allow selecting a title", async ({ browser }) => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto("/profile/user1");

    // Wait for profile data to finish loading — the useEffect in
    // useEditProfileForm fetches the profile and resets form state; if we act
    // before it completes, our selection gets overwritten.
    await page1.waitForLoadState("networkidle");
    await page1.getByRole("combobox").selectOption("Game Master");

    // Preview badge should appear next to the dropdown
    await expect(page1.locator("div").filter({ hasText: /^Game Master$/ })).toBeVisible();

    await page1.getByRole("button", { name: "Submit" }).click();
    await expect(page1.getByText("Profile updated successfully")).toBeVisible();

    // Verify from another user's view
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await logInUser(page2, "user2", "pwd2222");
    await page2.goto("/profile/user1");
    await expect(page2.getByText("Game Master")).toBeVisible();
    await ctx2.close();
  });

  test("should allow choosing a different avatar", async ({ browser }) => {
    await logInUser(page1, "user1", "pwd1111");
    await page1.goto("/profile/user1");

    // Wait for profile data to finish loading before interacting
    await page1.waitForLoadState("networkidle");

    // Click the Dragon avatar button (each button contains an img with alt=label)
    await page1.getByAltText("Dragon").click();

    await page1.getByRole("button", { name: "Submit" }).click();
    await expect(page1.getByText("Profile updated successfully")).toBeVisible();

    // Verify from another user's view
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await logInUser(page2, "user2", "pwd2222");
    await page2.goto("/profile/user1");
    const profilePic = page2.getByAltText("Profile picture");
    await expect(profilePic).toHaveAttribute("src", /dragon/);
    await ctx2.close();
  });
});
