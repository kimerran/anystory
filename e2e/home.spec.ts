import { test, expect } from "@playwright/test";

test("home page loads with generator form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("AnyStory").first()).toBeVisible();
  await expect(page.getByPlaceholder(/https:\/\//i)).toBeVisible();
  await expect(page.getByRole("button", { name: /generate/i })).toBeVisible();
});

test("home page shows sign-in nudge for guest", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/sign in with google/i)).toBeVisible();
});

test("sign-in page renders Google button", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /continue without signing in/i })).toBeVisible();
});

test("URL validation shows error on empty submit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /generate/i }).click();
  await expect(page.getByText(/valid url/i)).toBeVisible();
});
