import { expect, test } from "@playwright/test";

test("health, catalog and voices respond", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).ffmpeg).toContain("ffmpeg");
  const catalog = await request.get("/api/catalog");
  expect((await catalog.json()).stories.length).toBeGreaterThan(0);
  const voices = await request.get("/api/voices");
  const v = await voices.json();
  expect(v.locales["te-IN"].voices).toHaveLength(8);
});

test("rendition endpoint validates input and admin is hidden without a token", async ({ request }) => {
  const bad = await request.post("/api/audio/renditions", {
    data: { storyId: "../x", locale: "en-IN", voice: "default" },
    headers: { "sec-fetch-site": "same-origin" },
  });
  expect(bad.status()).toBe(400);
  const unknown = await request.post("/api/audio/renditions", {
    data: { storyId: "nope-nope", locale: "en-IN", voice: "default" },
    headers: { "sec-fetch-site": "same-origin" },
  });
  expect(unknown.status()).toBe(404);
  const admin = await request.get("/api/admin/usage");
  expect(admin.status()).toBe(404);
});

test("service worker and manifest are served", async ({ request }) => {
  const sw = await request.get("/serwist/sw.js");
  expect(sw.ok()).toBeTruthy();
  expect(sw.headers()["content-type"]).toContain("javascript");
  expect(await sw.text()).toContain("story-audio-v1");
  const manifest = await request.get("/manifest.webmanifest");
  expect((await manifest.json()).display).toBe("standalone");
});
