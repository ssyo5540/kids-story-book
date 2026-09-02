import { expect, test } from "@playwright/test";

test("home shows tonight's pick and shelves", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Tonight's pick")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How long until lights out?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Arjuna and the Bird's Eye/ }).first()).toBeVisible();
});

test("filters sync with the URL and narrow results", async ({ page }) => {
  await page.goto("/collections?duration=15&myth=indian");
  await expect(page.getByRole("button", { name: "15 min", exact: true, pressed: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Shabari's Berries/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Arjuna and the Bird's Eye/ })).toHaveCount(0);

  await page.getByRole("button", { name: "5 min", exact: true }).click();
  await expect(page).toHaveURL(/duration=5%2C15|duration=5,15/);
  await expect(page.getByRole("link", { name: /Arjuna and the Bird's Eye/ })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search stories" }).fill("berries");
  await expect(page).toHaveURL(/q=berries/);
  await expect(page.getByRole("link", { name: /Shabari's Berries/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Arjuna and the Bird's Eye/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page).toHaveURL(/\/collections$/);
});

test("story page shows read-along text and language chips", async ({ page }) => {
  await page.goto("/stories/shabaris-berries");
  await expect(page.getByRole("heading", { name: "Shabari's Berries", level: 1 })).toBeVisible();
  await expect(page.getByText("Listen in")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Read along" })).toBeVisible();
  await expect(page.getByText("Deep in a green forest")).toBeVisible();
});

test("unknown story renders the not-found page", async ({ page }) => {
  const res = await page.goto("/stories/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("drifted off to sleep")).toBeVisible();
});
