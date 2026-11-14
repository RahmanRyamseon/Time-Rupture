import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Use the git commit as the precache revision for the offline page.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [
    { url: "/offline", revision },
    { url: "/hi/offline", revision },
  ],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});
