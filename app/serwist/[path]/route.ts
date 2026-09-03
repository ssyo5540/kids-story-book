import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  process.env.RAILWAY_GIT_COMMIT_SHA ??
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: "/collections", revision },
    { url: "/voices", revision },
    { url: "/downloads", revision },
    { url: "/settings", revision },
    { url: "/~offline", revision },
    // Files under public/ (silence clip, ambience loops, icons) are precached automatically with content hashes;
    // listing one here again makes Workbox reject the whole precache list (conflicting revisions).
  ],
});
