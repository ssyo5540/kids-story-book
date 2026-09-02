import { expect, test } from "@playwright/test";

type Page = import("@playwright/test").Page;
const audioStateOf = (page: Page) =>
  page.evaluate(() => {
    const a = document.querySelector("audio");
    return { src: a?.src ?? "", paused: a?.paused ?? true, time: a?.currentTime ?? 0, duration: a?.duration ?? 0 };
  });

test("play a story, see the player, pause and resume position", async ({ page }) => {
  const audioState = () => audioStateOf(page);
  await page.goto("/stories/arjuna-and-the-birds-eye");
  await page.getByRole("button", { name: /Play Arjuna/ }).click();

  // sheet opens with the narrator line
  await expect(page.getByText(/Read by/)).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => (await audioState()).src, { timeout: 120_000 })
    .toContain("/audio/arjuna-and-the-birds-eye/en-IN/");
  await expect.poll(async () => (await audioState()).paused, { timeout: 30_000 }).toBe(false);

  await page.waitForTimeout(1500);
  await page.getByRole("dialog").getByRole("button", { name: "Forward 15 seconds" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pause" }).click();
  await expect.poll(async () => (await audioState()).paused).toBe(true);
  const { time } = await audioState();
  expect(time).toBeGreaterThan(10);

  // reload: position is remembered and offered on resume
  await page.reload();
  await expect(page.getByRole("button", { name: /Play Arjuna/ })).toContainText("Resume");
});

test("switching voice keeps the position and shows preparing state", async ({ page }) => {
  const audioState = () => audioStateOf(page);
  await page.goto("/stories/arjuna-and-the-birds-eye");
  await page.getByRole("button", { name: /Play Arjuna/ }).click();
  await expect
    .poll(async () => (await audioState()).src, { timeout: 120_000 })
    .toContain("/audio/arjuna-and-the-birds-eye/en-IN/");
  await expect.poll(async () => (await audioState()).paused, { timeout: 30_000 }).toBe(false);
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: /^Voice/ }).click();
  await expect(page.getByRole("heading", { name: "Who should read tonight?" })).toBeVisible();
  await page.getByRole("button", { name: /Choose Nila/ }).click();
  await page.getByRole("button", { name: "Use this voice" }).click();
  const prepare = page.getByRole("button", { name: "Prepare and play" });
  if (await prepare.isVisible().catch(() => false)) await prepare.click();

  await expect.poll(async () => (await audioState()).src, { timeout: 90_000 }).toContain("/en-IN/Zephyr/");
  await expect.poll(async () => (await audioState()).paused, { timeout: 30_000 }).toBe(false);
  const { time } = await audioState();
  expect(time).toBeGreaterThan(1.5);
});

test("sleep timer menu and ambience menu render options", async ({ page }) => {
  await page.goto("/stories/arjuna-and-the-birds-eye");
  await page.getByRole("button", { name: /Play Arjuna/ }).click();
  await expect(page.getByText(/Read by/)).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => (await audioStateOf(page)).src, { timeout: 120_000 })
    .toContain("/audio/arjuna-and-the-birds-eye/en-IN/");
  await page.getByRole("button", { name: /^Sleep/ }).click();
  await expect(page.getByRole("button", { name: "End of story" })).toBeVisible();
  await page.getByRole("button", { name: "10 min" }).click();
  await expect(page.getByRole("button", { name: /^Sleep/ })).toContainText(/min/);
  await page.getByRole("button", { name: /^Sounds/ }).click();
  await page.getByRole("button", { name: "Rain", exact: true }).click();
  await expect(page.getByRole("button", { name: "Whisper" })).toBeVisible();
  const ambience = await page.evaluate(() => document.querySelectorAll("audio")[1]?.src ?? "");
  expect(ambience).toContain("/ambience/rain-");
});
